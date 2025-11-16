import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdminConfigurationChangeLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdminConfigurationChangeLog";
import type { IShoppingMallAdminConfigurationChangeLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminConfigurationChangeLog";
import type { IShoppingMallConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallConfig";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

/**
 * Validate pagination and created_at-desc sorting of admin configuration change
 * logs.
 *
 * Business goals:
 *
 * - Ensure that the admin configuration change log search endpoint supports
 *   page/limit pagination semantics that are internally consistent with the
 *   returned data and total record counts.
 * - Ensure that when sortBy="created_at" and sortDirection="desc" are used, the
 *   logs are returned with the newest entries first, and that order is stable
 *   within a page.
 * - Optionally, when enough data exists for multiple pages, validate that the
 *   second page contains a disjoint slice of results (no id overlap with the
 *   first page) and obeys the same sorting rules.
 *
 * Important constraints:
 *
 * - The SDK surface in this test only exposes creation of configs, not their
 *   update; change logs are generated elsewhere, so this test treats the log
 *   dataset as pre-populated and focuses on contract validation rather than
 *   seeding.
 * - Therefore, checks that rely on there being more than one page of data are
 *   conditional; if the dataset is too small, the test still passes after
 *   validating single-page behavior.
 */
export async function test_api_admin_configuration_change_logs_pagination_and_sorting(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a platform admin to obtain an authorized session.
  const joinRequest = {
    email: `admin+${RandomGenerator.alphaNumeric(8)}@example.com`,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinRequest,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);

  // 2. Optionally create a few configuration entries as realistic admin actions.
  const configCount: number = 3;
  const createdConfigs: IShoppingMallConfig[] = await ArrayUtil.asyncMap(
    ArrayUtil.repeat(configCount, (index) => index),
    async (index) => {
      const body = {
        namespace: `test_namespace_${RandomGenerator.alphabets(5)}`,
        key: `test_key_${index}_${RandomGenerator.alphabets(4)}`,
        value: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        active: true,
      } satisfies IShoppingMallConfig.ICreate;

      const cfg: IShoppingMallConfig =
        await api.functional.shoppingMall.platformAdmin.configs.create(
          connection,
          { body },
        );
      typia.assert<IShoppingMallConfig>(cfg);
      return cfg;
    },
  );
  TestValidator.predicate(
    "createdConfigs length matches requested count",
    createdConfigs.length === configCount,
  );

  // 3. Call adminConfigurationChangeLogs.index for page 1 with created_at desc.
  const requestPage1 = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    sortBy: "created_at",
    sortDirection: "desc",
    configDomains: undefined,
    configScope: undefined,
    adminId: undefined,
    changedKeysKeyword: undefined,
    reasonKeyword: undefined,
    createdAtFrom: undefined,
    createdAtTo: undefined,
  } satisfies IShoppingMallAdminConfigurationChangeLog.IRequest;

  const page1: IPageIShoppingMallAdminConfigurationChangeLog.ISummary =
    await api.functional.shoppingMall.platformAdmin.adminConfigurationChangeLogs.index(
      connection,
      { body: requestPage1 },
    );
  typia.assert<IPageIShoppingMallAdminConfigurationChangeLog.ISummary>(page1);

  const pagination1: IPage.IPagination = page1.pagination;
  const data1: IShoppingMallAdminConfigurationChangeLog.ISummary[] = page1.data;

  // 4. Basic pagination invariants for first page.
  TestValidator.predicate(
    "pagination.current is non-negative",
    pagination1.current >= 0,
  );
  TestValidator.predicate(
    "pagination.limit is non-negative",
    pagination1.limit >= 0,
  );
  TestValidator.predicate(
    "pagination.records is non-negative",
    pagination1.records >= 0,
  );
  TestValidator.predicate(
    "pagination.pages is non-negative",
    pagination1.pages >= 0,
  );

  if (pagination1.records === 0) {
    // When there is no data, pages should be 0 and data empty.
    TestValidator.predicate(
      "no records implies pages is 0",
      pagination1.pages === 0,
    );
    TestValidator.predicate(
      "no records implies current is 0",
      pagination1.current === 0,
    );
    TestValidator.predicate(
      "no records implies data is empty",
      data1.length === 0,
    );
    return;
  }

  // When there are records, data length must be > 0 and <= limit.
  TestValidator.predicate(
    "data length positive when records > 0",
    data1.length > 0,
  );
  TestValidator.predicate(
    "data length does not exceed pagination.limit",
    data1.length <= pagination1.limit,
  );
  TestValidator.predicate(
    "records count is at least the number of items in page 1",
    pagination1.records >= data1.length,
  );

  // 5. Validate created_at is sorted in non-increasing order on page 1.
  for (let i = 1; i < data1.length; i += 1) {
    const prev = data1[i - 1];
    const curr = data1[i];
    TestValidator.predicate(
      `page1 created_at[${i - 1}] >= created_at[${i}] for desc sorting`,
      prev.created_at >= curr.created_at,
    );
  }

  // 6. If there are at least two pages of data, fetch and validate page 2.
  const hasSecondPage: boolean = pagination1.pages >= 2;
  if (!hasSecondPage) return;

  const requestPage2 = {
    page: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    sortBy: "created_at",
    sortDirection: "desc",
    configDomains: undefined,
    configScope: undefined,
    adminId: undefined,
    changedKeysKeyword: undefined,
    reasonKeyword: undefined,
    createdAtFrom: undefined,
    createdAtTo: undefined,
  } satisfies IShoppingMallAdminConfigurationChangeLog.IRequest;

  const page2: IPageIShoppingMallAdminConfigurationChangeLog.ISummary =
    await api.functional.shoppingMall.platformAdmin.adminConfigurationChangeLogs.index(
      connection,
      { body: requestPage2 },
    );
  typia.assert<IPageIShoppingMallAdminConfigurationChangeLog.ISummary>(page2);

  const pagination2: IPage.IPagination = page2.pagination;
  const data2: IShoppingMallAdminConfigurationChangeLog.ISummary[] = page2.data;

  // Pagination invariants for page 2.
  TestValidator.predicate(
    "page2 pagination.current is within pages range",
    pagination2.current >= 0 && pagination2.current < pagination2.pages,
  );
  TestValidator.predicate(
    "page2 records count matches page1 records",
    pagination2.records === pagination1.records,
  );

  if (pagination2.records === 0) {
    TestValidator.predicate(
      "page2 no records implies data empty",
      data2.length === 0,
    );
    return;
  }

  TestValidator.predicate(
    "page2 data length does not exceed pagination.limit",
    data2.length <= pagination2.limit,
  );

  // Validate created_at sorting on page 2.
  for (let i = 1; i < data2.length; i += 1) {
    const prev = data2[i - 1];
    const curr = data2[i];
    TestValidator.predicate(
      `page2 created_at[${i - 1}] >= created_at[${i}] for desc sorting`,
      prev.created_at >= curr.created_at,
    );
  }

  // 7. Ensure no overlap between page1 and page2 ids.
  const idsPage1 = new Set<string>(data1.map((log) => log.id));
  const hasOverlap = data2.some((log) => idsPage1.has(log.id));
  TestValidator.predicate(
    "page1 and page2 log IDs should not overlap",
    hasOverlap === false,
  );
}
