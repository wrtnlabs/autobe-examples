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

export async function test_api_admin_configuration_change_logs_filter_by_admin_and_time_range(
  connection: api.IConnection,
) {
  /**
   * Validate that platform admins can filter configuration change logs by
   * acting administrator and creation time window for audit investigations.
   *
   * Business flow implemented:
   *
   * 1. Register Platform Admin A via POST /auth/platformAdmin/join
   *    (auto-authenticated).
   * 2. Under Admin A session, create multiple configs via POST
   *    /shoppingMall/platformAdmin/configs. These actions are expected to
   *    generate admin configuration change logs attributed to Admin A.
   * 3. Register Platform Admin B via the same join endpoint; under Admin B
   *    session, create at least one config to generate logs attributed to Admin
   *    B, providing cross-admin noise.
   * 4. Switch back to Admin A context by joining again with a fresh Admin A
   *    account for this test (simplest way to ensure Authorization header
   *    corresponds to Admin A actor for the index call).
   * 5. Build a time window (createdAtFrom/createdAtTo) that bounds the period when
   *    Admin A configs were created. For simplicity and determinism, we use a
   *    broad window (e.g., from a bit before now to a bit after now) that
   *    certainly includes these changes.
   * 6. Call PATCH /shoppingMall/platformAdmin/adminConfigurationChangeLogs with
   *    body of type IShoppingMallAdminConfigurationChangeLog.IRequest,
   *    including:
   *
   *    - AdminId: Admin A.id
   *    - CreatedAtFrom / createdAtTo: ISO date-time strings
   *    - Page and limit: small page (page=1, limit=50)
   * 7. Assert that returned page data (if any records exist) satisfy:
   *
   *    - Every entry.platformAdmin.id === Admin A.id
   *    - Created_at is within [createdAtFrom, createdAtTo]
   *    - No entry.platformAdmin.id equals Admin B.id
   */

  // 1. Register Platform Admin A (Admin A)
  const adminAJoinBody = {
    email: `${RandomGenerator.alphabets(8)}+adminA@example.com`,
    name: RandomGenerator.name(1),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: `https://admin.example.com/${RandomGenerator.alphabets(5)}`,
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const adminA: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminAJoinBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(adminA);

  // 2. Under Admin A session, create multiple configs to generate change logs
  const adminAConfigCount = 3;
  const adminAConfigs: IShoppingMallConfig[] = await ArrayUtil.asyncRepeat(
    adminAConfigCount,
    async (index) => {
      const createBody = {
        namespace: "audit_test_adminA",
        key: `feature_flag_${index}`,
        value: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        active: true,
      } satisfies IShoppingMallConfig.ICreate;

      const created: IShoppingMallConfig =
        await api.functional.shoppingMall.platformAdmin.configs.create(
          connection,
          {
            body: createBody,
          },
        );
      typia.assert<IShoppingMallConfig>(created);
      return created;
    },
  );

  TestValidator.equals(
    "created config count for admin A",
    adminAConfigs.length,
    adminAConfigCount,
  );

  // Capture a time window roughly around now that should include the above changes
  const now = new Date();
  const fromDate = new Date(now.getTime() - 5 * 60 * 1000); // 5 minutes before
  const toDate = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes after
  const createdAtFrom: string & tags.Format<"date-time"> =
    fromDate.toISOString();
  const createdAtTo: string & tags.Format<"date-time"> = toDate.toISOString();

  // 3. Register Platform Admin B (Admin B)
  const adminBJoinBody = {
    email: `${RandomGenerator.alphabets(8)}+adminB@example.com`,
    name: RandomGenerator.name(1),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: `https://admin.example.com/${RandomGenerator.alphabets(5)}`,
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const adminB: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminBJoinBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(adminB);

  // Under Admin B session, create at least one config as noise
  const adminBConfigBody = {
    namespace: "audit_test_adminB",
    key: "noise_flag",
    value: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    active: true,
  } satisfies IShoppingMallConfig.ICreate;

  const adminBConfig: IShoppingMallConfig =
    await api.functional.shoppingMall.platformAdmin.configs.create(connection, {
      body: adminBConfigBody,
    });
  typia.assert<IShoppingMallConfig>(adminBConfig);

  // 4. Switch back to an Admin A context for querying logs by simply joining another admin A
  const adminA2JoinBody = {
    email: `${RandomGenerator.alphabets(8)}+adminA2@example.com`,
    name: RandomGenerator.name(1),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: `https://admin.example.com/${RandomGenerator.alphabets(5)}`,
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const adminA2: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminA2JoinBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(adminA2);

  // For filtering, we want to target logs made by the first Admin A, so use adminA.id
  const filterAdminId = adminA.id;

  // 5. Call adminConfigurationChangeLogs.index with adminId and time range filters
  const requestBody = {
    page: 1,
    limit: 50,
    sortBy: "created_at",
    sortDirection: "desc", // newest first
    adminId: filterAdminId,
    createdAtFrom,
    createdAtTo,
  } satisfies IShoppingMallAdminConfigurationChangeLog.IRequest;

  const page: IPageIShoppingMallAdminConfigurationChangeLog.ISummary =
    await api.functional.shoppingMall.platformAdmin.adminConfigurationChangeLogs.index(
      connection,
      {
        body: requestBody,
      },
    );
  typia.assert<IPageIShoppingMallAdminConfigurationChangeLog.ISummary>(page);

  const pagination: IPage.IPagination = page.pagination;
  typia.assert<IPage.IPagination>(pagination);

  // Basic pagination sanity checks
  TestValidator.predicate(
    "pagination current page non-negative",
    pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit non-negative",
    pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    pagination.pages >= 0,
  );

  const data = page.data;

  // 6. Validate each log entry matches the adminId and is within the time window
  for (const log of data) {
    typia.assert<IShoppingMallAdminConfigurationChangeLog.ISummary>(log);

    TestValidator.equals(
      "log platformAdmin.id must equal filterAdminId",
      log.platformAdmin.id,
      filterAdminId,
    );

    const createdAt = new Date(log.created_at).getTime();
    const fromMillis = new Date(createdAtFrom).getTime();
    const toMillis = new Date(createdAtTo).getTime();

    TestValidator.predicate(
      "log created_at must be within [createdAtFrom, createdAtTo]",
      createdAt >= fromMillis && createdAt <= toMillis,
    );

    // Ensure that no logs from Admin B appear when filtering by Admin A
    TestValidator.notEquals(
      "log must not belong to admin B when filtering by admin A",
      log.platformAdmin.id,
      adminB.id,
    );
  }
}
