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
 * Verify that configuration change analytics can be filtered by acting admin
 * and configuration domain.
 *
 * Business goal: Platform admins need to audit configuration changes by who
 * changed what, in which configuration domain. This test ensures that the
 * analytics endpoint
 * `/shoppingMall/platformAdmin/analytics/adminConfigurations` correctly scopes
 * results when filters for an administrator id and configuration domains are
 * applied.
 *
 * High-level steps:
 *
 * 1. Register two platform admins (Admin A and Admin B) via POST
 *    /auth/platformAdmin/join.
 * 2. As Admin A, create one or more configs in a shared namespace (e.g.
 *    "refunds").
 * 3. As Admin B, create other configs in the same namespace and another namespace
 *    to ensure cross-admin and cross-domain data exists.
 * 4. Build an IShoppingMallAdminConfigurationChangeLog.IRequest that:
 *
 *    - Requests page 1, a small positive limit.
 *    - Sets configDomains to the shared namespace used above.
 *    - Sets adminId to Admin A’s id.
 *    - Sets createdAtFrom/createdAtTo to a window that definitely covers all created
 *         configs (for simplicity, the test can omit these or use a very wide
 *         window since the DTO marks them optional).
 * 5. Call PATCH /shoppingMall/platformAdmin/analytics/adminConfigurations.
 * 6. Assert the response type and business rules:
 *
 *    - Pagination.records >= 1.
 *    - Every entry in data has platformAdmin.id equal to Admin A’s id.
 *    - Every entry’s config_domain equals the chosen namespace.
 *    - No entries are attributed to Admin B in the filtered result.
 * 7. Optionally, repeat step 4–6 for Admin B to validate symmetrical behavior.
 */
export async function test_api_admin_configuration_change_logs_filter_by_admin_and_domain(
  connection: api.IConnection,
) {
  // 1. Register Admin A
  const adminAJoinBody =
    typia.random<IShoppingMallPlatformAdminJoin.IRequest>();
  const adminA: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminAJoinBody,
    });
  typia.assert(adminA);

  // 2. Register Admin B (create a separate connection so tokens don't clash)
  const adminBConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  const adminBJoinBody =
    typia.random<IShoppingMallPlatformAdminJoin.IRequest>();
  const adminB: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(adminBConnection, {
      body: adminBJoinBody,
    });
  typia.assert(adminB);

  // Choose a shared configuration domain/namespace for both admins.
  const sharedNamespace = "refunds";

  // 3. As Admin A (using original connection), create several configs in shared namespace.
  const adminAConfigBodies: IShoppingMallConfig.ICreate[] = ArrayUtil.repeat(
    3,
    () => {
      const key = RandomGenerator.alphaNumeric(8);
      return {
        namespace: sharedNamespace,
        key,
        value: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        active: true,
      } satisfies IShoppingMallConfig.ICreate;
    },
  );

  const adminAConfigs: IShoppingMallConfig[] = [];
  for (const body of adminAConfigBodies) {
    const created =
      await api.functional.shoppingMall.platformAdmin.configs.create(
        connection,
        { body },
      );
    typia.assert(created);
    adminAConfigs.push(created);
  }

  // 4. As Admin B (using adminBConnection), create configs in shared and other namespaces.
  const otherNamespace = "shipping";
  const adminBConfigBodies: IShoppingMallConfig.ICreate[] = [
    {
      namespace: sharedNamespace,
      key: RandomGenerator.alphaNumeric(8),
      value: RandomGenerator.paragraph({ sentences: 3 }),
      description: RandomGenerator.paragraph({ sentences: 2 }),
      active: true,
    } satisfies IShoppingMallConfig.ICreate,
    {
      namespace: otherNamespace,
      key: RandomGenerator.alphaNumeric(8),
      value: RandomGenerator.paragraph({ sentences: 3 }),
      description: RandomGenerator.paragraph({ sentences: 2 }),
      active: true,
    } satisfies IShoppingMallConfig.ICreate,
  ];

  const adminBConfigs: IShoppingMallConfig[] = [];
  for (const body of adminBConfigBodies) {
    const created =
      await api.functional.shoppingMall.platformAdmin.configs.create(
        adminBConnection,
        { body },
      );
    typia.assert(created);
    adminBConfigs.push(created);
  }

  // 5. Query analytics filtered by Admin A and shared domain.
  const requestByAdminA = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 20 as number & tags.Type<"int32"> & tags.Minimum<1>,
    configDomains: [sharedNamespace],
    adminId: adminA.id,
  } satisfies IShoppingMallAdminConfigurationChangeLog.IRequest;

  const analyticsByAdminA: IPageIShoppingMallAdminConfigurationChangeLog.ISummary =
    await api.functional.shoppingMall.platformAdmin.analytics.adminConfigurations.index(
      connection,
      { body: requestByAdminA },
    );
  typia.assert(analyticsByAdminA);

  const paginationA = analyticsByAdminA.pagination;
  const dataA = analyticsByAdminA.data;

  // Ensure we received at least one record (assuming change logs are created for config creation).
  TestValidator.predicate(
    "analytics by Admin A should have at least one record",
    paginationA.records >= 1,
  );

  // All records should belong to Admin A and the requested domain.
  for (const summary of dataA) {
    typia.assert<IShoppingMallAdminConfigurationChangeLog.ISummary>(summary);
    TestValidator.equals(
      "each summary.platformAdmin.id should equal Admin A id",
      summary.platformAdmin.id,
      adminA.id,
    );
    TestValidator.equals(
      "each summary.config_domain should equal shared namespace",
      summary.config_domain,
      sharedNamespace,
    );
    TestValidator.notEquals(
      "no summary should belong to Admin B when filtering by Admin A",
      summary.platformAdmin.id,
      adminB.id,
    );
  }

  // 6. Optionally, repeat for Admin B to validate symmetry on the shared domain.
  const requestByAdminB = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 20 as number & tags.Type<"int32"> & tags.Minimum<1>,
    configDomains: [sharedNamespace],
    adminId: adminB.id,
  } satisfies IShoppingMallAdminConfigurationChangeLog.IRequest;

  const analyticsByAdminB: IPageIShoppingMallAdminConfigurationChangeLog.ISummary =
    await api.functional.shoppingMall.platformAdmin.analytics.adminConfigurations.index(
      adminBConnection,
      { body: requestByAdminB },
    );
  typia.assert(analyticsByAdminB);

  const paginationB = analyticsByAdminB.pagination;
  const dataB = analyticsByAdminB.data;

  TestValidator.predicate(
    "analytics by Admin B should have at least one record in shared domain",
    paginationB.records >= 1,
  );

  for (const summary of dataB) {
    typia.assert<IShoppingMallAdminConfigurationChangeLog.ISummary>(summary);
    TestValidator.equals(
      "each summary.platformAdmin.id should equal Admin B id",
      summary.platformAdmin.id,
      adminB.id,
    );
    TestValidator.equals(
      "each summary.config_domain should equal shared namespace for Admin B filter",
      summary.config_domain,
      sharedNamespace,
    );
    TestValidator.notEquals(
      "no summary should belong to Admin A when filtering by Admin B",
      summary.platformAdmin.id,
      adminA.id,
    );
  }
}
