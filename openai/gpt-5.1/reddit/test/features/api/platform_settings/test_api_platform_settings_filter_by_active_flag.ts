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

export async function test_api_platform_settings_filter_by_active_flag(
  connection: api.IConnection,
) {
  // 1. Register a platform admin and obtain authenticated context
  const joinBody = {
    username: `admin_${RandomGenerator.alphaNumeric(8)}`,
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    ip: undefined,
    href: "https://admin.example.com/register",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const admin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(admin);

  // 2. Create two platform settings under a unique key namespace
  const testKeyPrefix = `e2e.platformSettings.activeFilter.${RandomGenerator.alphaNumeric(8)}`;

  const activeCreateBody = {
    key: `${testKeyPrefix}.active`,
    value: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    is_active: true,
  } satisfies ICommunityPlatformPlatformSetting.ICreate;

  const activeSetting: ICommunityPlatformPlatformSetting =
    await api.functional.communityPlatform.platformAdmin.platformSettings.create(
      connection,
      { body: activeCreateBody },
    );
  typia.assert<ICommunityPlatformPlatformSetting>(activeSetting);

  const inactiveCreateBody = {
    key: `${testKeyPrefix}.inactive`,
    value: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    is_active: false,
  } satisfies ICommunityPlatformPlatformSetting.ICreate;

  const inactiveSetting: ICommunityPlatformPlatformSetting =
    await api.functional.communityPlatform.platformAdmin.platformSettings.create(
      connection,
      { body: inactiveCreateBody },
    );
  typia.assert<ICommunityPlatformPlatformSetting>(inactiveSetting);

  // Basic sanity assertions on created settings
  TestValidator.equals(
    "active setting key should match request",
    activeSetting.key,
    activeCreateBody.key,
  );
  TestValidator.equals(
    "inactive setting key should match request",
    inactiveSetting.key,
    inactiveCreateBody.key,
  );
  TestValidator.equals(
    "active setting is_active must be true",
    activeSetting.is_active,
    true,
  );
  TestValidator.equals(
    "inactive setting is_active must be false",
    inactiveSetting.is_active,
    false,
  );
  TestValidator.equals(
    "active setting deleted_at should be null on creation",
    activeSetting.deleted_at ?? null,
    null,
  );
  TestValidator.equals(
    "inactive setting deleted_at should be null on creation",
    inactiveSetting.deleted_at ?? null,
    null,
  );

  // 3. Search for active settings in this namespace
  const page = 1;
  const limit = 20;

  const activeIndexBody = {
    page,
    limit,
    isActive: true,
    key: null,
    search: testKeyPrefix,
    createdFrom: null,
    createdTo: null,
    updatedFrom: null,
    updatedTo: null,
    orderBy: null,
    orderDirection: null,
  } satisfies ICommunityPlatformPlatformSetting.IRequest;

  const activePage: IPageICommunityPlatformPlatformSetting.ISummary =
    await api.functional.communityPlatform.platformAdmin.platformSettings.index(
      connection,
      { body: activeIndexBody },
    );
  typia.assert<IPageICommunityPlatformPlatformSetting.ISummary>(activePage);

  const activeOwned = activePage.data.filter(
    (row) =>
      row.key.startsWith(testKeyPrefix) &&
      row.is_active === true &&
      (row.deleted_at ?? null) === null,
  );

  TestValidator.predicate(
    "at least one active setting from this test should be returned",
    activeOwned.length >= 1,
  );

  for (const row of activeOwned) {
    TestValidator.equals(
      "all activeOwned rows must be active",
      row.is_active,
      true,
    );
    TestValidator.equals(
      "all activeOwned rows must have null deleted_at",
      row.deleted_at ?? null,
      null,
    );
  }

  // Ensure our explicitly created active setting is included in activeOwned
  const activeInActiveOwned = activeOwned.some(
    (row) => row.id === activeSetting.id,
  );
  TestValidator.predicate(
    "explicitly created active setting should appear in active filter results",
    activeInActiveOwned,
  );

  // 4. Search for inactive settings in this namespace
  const inactiveIndexBody = {
    page,
    limit,
    isActive: false,
    key: null,
    search: testKeyPrefix,
    createdFrom: null,
    createdTo: null,
    updatedFrom: null,
    updatedTo: null,
    orderBy: null,
    orderDirection: null,
  } satisfies ICommunityPlatformPlatformSetting.IRequest;

  const inactivePage: IPageICommunityPlatformPlatformSetting.ISummary =
    await api.functional.communityPlatform.platformAdmin.platformSettings.index(
      connection,
      { body: inactiveIndexBody },
    );
  typia.assert<IPageICommunityPlatformPlatformSetting.ISummary>(inactivePage);

  const inactiveOwned = inactivePage.data.filter(
    (row) =>
      row.key.startsWith(testKeyPrefix) &&
      row.is_active === false &&
      (row.deleted_at ?? null) === null,
  );

  TestValidator.predicate(
    "at least one inactive setting from this test should be returned",
    inactiveOwned.length >= 1,
  );

  for (const row of inactiveOwned) {
    TestValidator.equals(
      "all inactiveOwned rows must be inactive",
      row.is_active,
      false,
    );
    TestValidator.equals(
      "all inactiveOwned rows must have null deleted_at",
      row.deleted_at ?? null,
      null,
    );
  }

  // Ensure our explicitly created inactive setting is included in inactiveOwned
  const inactiveInInactiveOwned = inactiveOwned.some(
    (row) => row.id === inactiveSetting.id,
  );
  TestValidator.predicate(
    "explicitly created inactive setting should appear in inactive filter results",
    inactiveInInactiveOwned,
  );

  // 5. Compare filtered vs union counts within this namespace
  const allOwnedMap = new Map<
    string,
    ICommunityPlatformPlatformSetting.ISummary
  >();
  for (const row of activePage.data.concat(inactivePage.data)) {
    if (
      row.key.startsWith(testKeyPrefix) &&
      (row.deleted_at ?? null) === null
    ) {
      allOwnedMap.set(row.id, row);
    }
  }

  const allOwned = Array.from(allOwnedMap.values());

  TestValidator.predicate(
    "all activeOwned ids should be present in allOwned",
    activeOwned.every((row) => allOwned.some((x) => x.id === row.id)),
  );
  TestValidator.predicate(
    "all inactiveOwned ids should be present in allOwned",
    inactiveOwned.every((row) => allOwned.some((x) => x.id === row.id)),
  );

  TestValidator.predicate(
    "active and inactive filters should not overlap for owned settings",
    activeOwned.every((a) => !inactiveOwned.some((i) => i.id === a.id)),
  );

  // 6. Validate pagination metadata consistency for active and inactive pages
  const validatePagination = (
    title: string,
    pageResult: IPageICommunityPlatformPlatformSetting.ISummary,
  ) => {
    const p = pageResult.pagination;
    TestValidator.equals(
      `${title} - current page should match request`,
      p.current,
      page,
    );
    TestValidator.predicate(
      `${title} - limit should be >= data length`,
      p.limit >= pageResult.data.length,
    );
    TestValidator.predicate(
      `${title} - records should be >= data length`,
      p.records >= pageResult.data.length,
    );
    TestValidator.predicate(`${title} - pages should be >= 0`, p.pages >= 0);
  };

  validatePagination("active settings page", activePage);
  validatePagination("inactive settings page", inactivePage);
}
