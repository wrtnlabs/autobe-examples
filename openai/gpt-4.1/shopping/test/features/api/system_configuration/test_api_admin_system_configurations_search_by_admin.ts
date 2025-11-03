import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingSystemConfiguration";
import type { IShoppingAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAdmin";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSystemConfiguration";

/**
 * E2E test for admin system configuration search API.
 *
 * 1. Register a new admin
 * 2. As admin, search configurations with different filters (partial config_key,
 *    creation date range, description keyword)
 * 3. Assert that only active (non-soft-deleted) configurations are returned
 * 4. Check that pagination metadata is correct
 * 5. Attempt access as unauthenticated/non-admin and assert access is denied
 */
export async function test_api_admin_system_configurations_search_by_admin(
  connection: api.IConnection,
) {
  // 1. Register admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const admin: IShoppingAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        name: RandomGenerator.name(),
        role: "super", // Assume "super" is a valid admin role. Adjust if not.
        status: "active",
      } satisfies IShoppingAdmin.IJoin,
    });
  typia.assert(admin);

  // 2. Prepare reference configuration data by searching without filter (get real configs from the API, for comparison)
  const pageSize = 5;
  const initialPage = 1;
  const fullDataPage: IPageIShoppingSystemConfiguration.ISummary =
    await api.functional.shopping.admin.systemConfigurations.index(connection, {
      body: {
        page: initialPage as number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: pageSize as number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
      } satisfies IShoppingSystemConfiguration.IRequest,
    });
  typia.assert(fullDataPage);
  TestValidator.predicate(
    "returned data array exists",
    Array.isArray(fullDataPage.data),
  );
  TestValidator.equals(
    "limit matches",
    fullDataPage.pagination.limit,
    pageSize,
  );

  // Find a reference config to use for filter scenario
  const refConfig = fullDataPage.data.find(
    (cfg) => !cfg.deleted_at && !!cfg.config_key && !!cfg.description,
  );
  const hasValidConfig = refConfig !== undefined;
  TestValidator.predicate(
    "at least one non-deleted config with key+description found",
    hasValidConfig,
  );
  if (!hasValidConfig) return;
  typia.assert(refConfig!);

  // 3a. Search by partial config_key (substring)
  const partialKey = refConfig!.config_key.substring(
    0,
    Math.max(1, Math.floor(refConfig!.config_key.length / 2)),
  );
  const partialKeyPage =
    await api.functional.shopping.admin.systemConfigurations.index(connection, {
      body: {
        page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: pageSize as number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
        search: partialKey,
      } satisfies IShoppingSystemConfiguration.IRequest,
    });
  typia.assert(partialKeyPage);
  TestValidator.predicate(
    "all returned config_keys contain partialKey",
    partialKeyPage.data.every((cfg) => cfg.config_key.includes(partialKey)),
  );

  // 3b. Search by exact config_key
  const exactKeyPage =
    await api.functional.shopping.admin.systemConfigurations.index(connection, {
      body: {
        page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: pageSize as number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
        configKey: refConfig!.config_key,
      } satisfies IShoppingSystemConfiguration.IRequest,
    });
  typia.assert(exactKeyPage);
  TestValidator.equals(
    "only configs with that key included",
    exactKeyPage.data[0]?.config_key,
    refConfig!.config_key,
  );

  // 3c. Search by created_at date range
  const createdFrom = refConfig!.created_at;
  const createdTo = refConfig!.created_at;
  const dateRangePage =
    await api.functional.shopping.admin.systemConfigurations.index(connection, {
      body: {
        page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: pageSize as number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
        createdFrom,
        createdTo,
      } satisfies IShoppingSystemConfiguration.IRequest,
    });
  typia.assert(dateRangePage);
  TestValidator.predicate(
    "all configs in date range",
    dateRangePage.data.every(
      (cfg) => cfg.created_at >= createdFrom && cfg.created_at <= createdTo,
    ),
  );

  // 3d. Search by description keyword (choose word from reference config)
  const [firstWord = refConfig!.description!] =
    refConfig!.description!.split(" ");
  const descPage =
    await api.functional.shopping.admin.systemConfigurations.index(connection, {
      body: {
        page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: pageSize as number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
        description: firstWord,
      } satisfies IShoppingSystemConfiguration.IRequest,
    });
  typia.assert(descPage);
  TestValidator.predicate(
    "all configs in description search have first word in description",
    descPage.data.every((cfg) => (cfg.description ?? "").includes(firstWord)),
  );

  // 4. Ensure all returned configs are not soft-deleted
  for (const cfg of [
    ...partialKeyPage.data,
    ...exactKeyPage.data,
    ...dateRangePage.data,
    ...descPage.data,
  ]) {
    TestValidator.equals(
      "all returned configs are not soft-deleted",
      cfg.deleted_at,
      null,
    );
  }

  // 5. Pagination metadata
  TestValidator.predicate(
    "pagination object present",
    typeof partialKeyPage.pagination === "object" &&
      partialKeyPage.pagination !== null,
  );
  TestValidator.predicate(
    "pagination limit positive",
    partialKeyPage.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination current page positive",
    partialKeyPage.pagination.current > 0,
  );

  // 6. Access denied when not authenticated as admin
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "non-admin cannot access configurations API",
    async () => {
      await api.functional.shopping.admin.systemConfigurations.index(
        unauthConn,
        {
          body: {
            page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
            limit: 1 as number &
              tags.Type<"int32"> &
              tags.Minimum<1> &
              tags.Maximum<100>,
          } satisfies IShoppingSystemConfiguration.IRequest,
        },
      );
    },
  );
}
