import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformPlatformSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformSetting";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPlatformSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPlatformSetting";

export async function test_api_platform_settings_search_basic_pagination(
  connection: api.IConnection,
) {
  // 1. Register platform admin and obtain authenticated context
  const adminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphabets(16),
    displayName: RandomGenerator.name(),
    // ip is optional; omit to let backend handle it
    href: "https://admin.console.local/signup",
    referrer: "https://admin.console.local/",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const admin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(admin);

  // 2. Create several platform settings (e.g., 4)
  const settingsToCreate = 4;
  const createdSettings: ICommunityPlatformPlatformSetting[] = [];

  for (let i = 0; i < settingsToCreate; i++) {
    const key = `test.setting.${RandomGenerator.alphaNumeric(8)}.${i}`;
    const createBody = {
      key,
      value: RandomGenerator.paragraph({ sentences: 2 }),
      description: RandomGenerator.paragraph({ sentences: 3 }),
      is_active: true,
    } satisfies ICommunityPlatformPlatformSetting.ICreate;

    const created =
      await api.functional.communityPlatform.platformAdmin.platformSettings.create(
        connection,
        { body: createBody },
      );
    typia.assert<ICommunityPlatformPlatformSetting>(created);
    createdSettings.push(created);
  }

  const createdIds = createdSettings.map((s) => s.id);
  const createdKeys = createdSettings.map((s) => s.key);

  // 3. Search with page=1, limit=2 via PATCH index
  const firstPageLimit = 2 as const;
  const indexRequestPage1 = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: firstPageLimit as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies ICommunityPlatformPlatformSetting.IRequest;

  const page1: IPageICommunityPlatformPlatformSetting.ISummary =
    await api.functional.communityPlatform.platformAdmin.platformSettings.index(
      connection,
      { body: indexRequestPage1 },
    );
  typia.assert<IPageICommunityPlatformPlatformSetting.ISummary>(page1);

  const pagination1 = page1.pagination;
  const data1 = page1.data;

  // 4. Basic pagination assertions for page 1
  TestValidator.equals(
    "pagination.current should be 1",
    pagination1.current,
    1,
  );
  TestValidator.equals(
    "pagination.limit should equal requested limit",
    pagination1.limit,
    firstPageLimit,
  );

  TestValidator.predicate(
    "records should be >= number of created settings",
    () => pagination1.records >= createdSettings.length,
  );

  TestValidator.predicate(
    "pages should be 0 when records is 0, otherwise >= 1",
    () =>
      (pagination1.records === 0 && pagination1.pages === 0) ||
      (pagination1.records > 0 && pagination1.pages >= 1),
  );

  TestValidator.predicate(
    "first page data length should be > 0 and <= limit",
    () => data1.length > 0 && data1.length <= firstPageLimit,
  );

  // Each summary entry should represent a valid setting; typia.assert already
  // guarantees shape, so we only enforce business expectations like non-deleted
  // active settings having null deleted_at and keys that exist in the system.
  for (const summary of data1) {
    TestValidator.predicate(
      "summary id must be a non-empty string",
      () => summary.id.length > 0,
    );
    TestValidator.predicate(
      "summary key must be a non-empty string",
      () => summary.key.length > 0,
    );

    // Newly created active settings in this test run must have deleted_at null.
    if (createdIds.includes(summary.id)) {
      TestValidator.equals(
        "created active setting should have deleted_at null",
        summary.deleted_at,
        null,
      );
      TestValidator.predicate(
        "created setting should be active",
        () => summary.is_active === true,
      );
    }
  }

  // 5. Optionally request page=2 and verify pagination consistency
  const indexRequestPage2 = {
    page: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: firstPageLimit as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies ICommunityPlatformPlatformSetting.IRequest;

  const page2: IPageICommunityPlatformPlatformSetting.ISummary =
    await api.functional.communityPlatform.platformAdmin.platformSettings.index(
      connection,
      { body: indexRequestPage2 },
    );
  typia.assert<IPageICommunityPlatformPlatformSetting.ISummary>(page2);

  const pagination2 = page2.pagination;
  const data2 = page2.data;

  // pagination.current for second page
  TestValidator.equals(
    "pagination.current on page 2 should be 2",
    pagination2.current,
    2,
  );
  TestValidator.equals(
    "pagination.limit on page 2 should equal requested limit",
    pagination2.limit,
    firstPageLimit,
  );

  // If there are enough records for multiple pages, page 2 may have data. When
  // records are insufficient, page 2 can legitimately be empty, which we
  // accept. In any case, data2.length must be <= limit.
  TestValidator.predicate(
    "second page data length should be <= limit",
    () => data2.length <= firstPageLimit,
  );

  // Ensure there is no duplicate id between page1 and page2 within the
  // returned slices.
  const ids1 = data1.map((s) => s.id);
  const ids2 = data2.map((s) => s.id);

  for (const id of ids2) {
    TestValidator.predicate(
      "no duplicated ids between page 1 and page 2",
      () => !ids1.includes(id),
    );
  }

  // Where both pages contain settings created in this test, verify their keys
  // are a subset of the keys we created.
  const pageKeys = [...data1, ...data2]
    .filter((s) => createdIds.includes(s.id))
    .map((s) => s.key);

  for (const key of pageKeys) {
    TestValidator.predicate(
      "page entries that belong to this test have keys from created set",
      () => createdKeys.includes(key),
    );
  }
}
