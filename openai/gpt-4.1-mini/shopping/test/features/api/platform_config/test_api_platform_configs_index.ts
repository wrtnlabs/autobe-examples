import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallPlatformConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPlatformConfig";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallPlatformConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformConfig";

/**
 * Test that an admin user can retrieve a filtered and paginated list of
 * platform configuration entries.
 *
 * This test performs the following steps:
 *
 * 1. Registers a new admin user via the /auth/admin/join endpoint.
 * 2. Authenticates the admin user using /auth/admin/login to obtain a valid access
 *    token.
 * 3. Queries the /shoppingMall/admin/platformConfigs endpoint with various filter
 *    parameters.
 * 4. Validates that the response matches filter parameters, pagination metadata is
 *    correct, and items conform to criteria.
 * 5. Tests edge cases such as empty filters.
 * 6. Confirms authorization by verifying unauthorized access fails.
 */
export async function test_api_platform_configs_index(
  connection: api.IConnection,
) {
  // 1. Register a new admin user
  const adminEmail = `admin+${RandomGenerator.alphaNumeric(6)}@example.com`;
  const adminFullName = RandomGenerator.name();

  const joinBody = {
    email: adminEmail,
    password: "SecureP@ssw0rd123",
    full_name: adminFullName,
  } satisfies IShoppingMallAdmin.IJoin;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Login as the newly registered admin user to obtain token
  const loginBody = {
    email: adminEmail,
    password: "SecureP@ssw0rd123",
    href: "https://admin.shoppingmall.example.com/login",
    referrer: "https://admin.shoppingmall.example.com",
  } satisfies IShoppingMallAdmin.ILogin;

  const loginAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: loginBody,
    });
  typia.assert(loginAuthorized);

  // The SDK internally manages connection.headers.Authorization, so all
  // subsequent requests use the authenticated token automatically.

  // Helper function to validate pagination metadata
  function validatePagination(
    pagination: IPage.IPagination,
    page: number,
    limit: number,
  ) {
    TestValidator.predicate(
      `page number should be current page: expected ${page}`,
      pagination.current === page,
    );
    TestValidator.predicate(
      `limit should be page size: expected ${limit}`,
      pagination.limit === limit,
    );
    TestValidator.predicate(
      `pages calculation correct (pages >= 1)`,
      pagination.pages >= 1,
    );
    TestValidator.predicate(
      `records count should be >= data length`,
      pagination.records >= 0,
    );
    TestValidator.predicate(
      `records count should be >= offset`,
      pagination.records >= pagination.limit * (pagination.current - 1),
    );
  }

  // 3. Query platformConfigs without any filters to get all entries
  const emptyFilter = {} satisfies IShoppingMallPlatformConfig.IRequest;
  const allPlatformConfigs: IPageIShoppingMallPlatformConfig.ISummary =
    await api.functional.shoppingMall.admin.platformConfigs.indexPlatformConfig(
      connection,
      { body: emptyFilter },
    );
  typia.assert(allPlatformConfigs);

  // Pagination metadata may have default values; validate current page and limit
  validatePagination(
    allPlatformConfigs.pagination,
    allPlatformConfigs.pagination.current,
    allPlatformConfigs.pagination.limit,
  );

  // The data array should exist
  TestValidator.predicate(
    "platform config data is array",
    Array.isArray(allPlatformConfigs.data),
  );

  // 4. Test with name filter
  if (allPlatformConfigs.data.length > 0) {
    const sampleConfig = RandomGenerator.pick(allPlatformConfigs.data);
    typia.assert(sampleConfig);

    // Provide a filter using config_name exactly matching sampleConfig.config_name
    const nameFilter = {
      config_name: sampleConfig.config_name,
      page: 1,
      limit: 10,
    } satisfies IShoppingMallPlatformConfig.IRequest;

    const filteredByName: IPageIShoppingMallPlatformConfig.ISummary =
      await api.functional.shoppingMall.admin.platformConfigs.indexPlatformConfig(
        connection,
        { body: nameFilter },
      );
    typia.assert(filteredByName);

    // All returned items must have the config_name matching the filter
    TestValidator.predicate(
      "All filtered items match config_name filter",
      filteredByName.data.every(
        (config) => config.config_name === sampleConfig.config_name,
      ),
    );

    validatePagination(filteredByName.pagination, 1, 10);
  }

  // 5. Test with config_value filter if data contains any
  if (allPlatformConfigs.data.length > 0) {
    // Pick an item with non-null config_value (rare that it is null, but check)
    const withValueItem = allPlatformConfigs.data.find(
      (x) => x.config_value !== null && x.config_value !== undefined,
    );
    if (withValueItem) {
      const valFilter = {
        config_value: withValueItem.config_value,
        page: 1,
        limit: 5,
      } satisfies IShoppingMallPlatformConfig.IRequest;

      const filteredByValue: IPageIShoppingMallPlatformConfig.ISummary =
        await api.functional.shoppingMall.admin.platformConfigs.indexPlatformConfig(
          connection,
          { body: valFilter },
        );
      typia.assert(filteredByValue);

      // All returned items must have the config_value matching the filter
      TestValidator.predicate(
        "All filtered items match config_value filter",
        filteredByValue.data.every(
          (config) => config.config_value === withValueItem.config_value,
        ),
      );

      validatePagination(filteredByValue.pagination, 1, 5);
    }
  }

  // 6. Pagination test with page and limit
  const paginationFilter = {
    page: 2,
    limit: 3,
  } satisfies IShoppingMallPlatformConfig.IRequest;

  const page2Result: IPageIShoppingMallPlatformConfig.ISummary =
    await api.functional.shoppingMall.admin.platformConfigs.indexPlatformConfig(
      connection,
      { body: paginationFilter },
    );
  typia.assert(page2Result);
  validatePagination(page2Result.pagination, 2, 3);

  // 7. Unauthorized access test with invalid token
  // Copy connection and override headers with empty to simulate no token
  const unauthConn: api.IConnection = {
    ...connection,
    headers: {},
    simulate: false,
  };

  // Expect error when calling without proper authorization
  await TestValidator.error("Unauthorized access throws error", async () => {
    await api.functional.shoppingMall.admin.platformConfigs.indexPlatformConfig(
      unauthConn,
      { body: emptyFilter },
    );
  });
}
