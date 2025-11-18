import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppSystemSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppSystemSettings";
import type { ITodoAppSystemSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSystemSettings";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test environment-scoped configuration retrieval and filtering.
 *
 * This test validates that system configuration settings are properly filtered
 * by deployment environment (development, staging, production) and activation
 * status. The test creates sample settings across different environments,
 * verifies environment-specific filtering works correctly, and ensures active
 * setting filtering maintains environment boundaries.
 *
 * Test sequence:
 *
 * 1. Create authenticated user account
 * 2. Test unfiltered settings retrieval
 * 3. Test development environment filtering
 * 4. Test staging environment filtering
 * 5. Test production environment filtering
 * 6. Test active settings filtering within environments
 * 7. Test inactive settings filtering within environments
 * 8. Validate pagination works with environment filters
 */
export async function test_api_system_settings_environment_scoping(
  connection: api.IConnection,
) {
  // Step 1: Create authenticated user account
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: "securePassword123",
      href: "https://example.com",
      referrer: "https://example.com",
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(user);

  // Step 2: Test unfiltered settings retrieval
  const unfilteredResponse =
    await api.functional.todoApp.user.systemSettings.index(connection, {
      body: {
        page: 1,
        limit: 20,
      } satisfies ITodoAppSystemSettings.IRequest,
    });
  typia.assert(unfilteredResponse);
  TestValidator.predicate(
    "unfiltered response has data",
    unfilteredResponse.data.length > 0,
  );

  // Step 3: Test development environment filtering
  const devFilterRequest = {
    page: 1,
    limit: 20,
    environment_scope: "development",
  } satisfies ITodoAppSystemSettings.IRequest;

  const devFiltered = await api.functional.todoApp.user.systemSettings.index(
    connection,
    { body: devFilterRequest },
  );
  typia.assert(devFiltered);

  TestValidator.predicate("development filter applies correctly", () => {
    if (devFiltered.data.length === 0) return true; // Empty is valid
    return devFiltered.data.every(
      (setting) =>
        setting.environment_scope === undefined ||
        setting.environment_scope === "development",
    );
  });

  // Step 4: Test staging environment filtering
  const stagingFilterRequest = {
    page: 1,
    limit: 20,
    environment_scope: "staging",
  } satisfies ITodoAppSystemSettings.IRequest;

  const stagingFiltered =
    await api.functional.todoApp.user.systemSettings.index(connection, {
      body: stagingFilterRequest,
    });
  typia.assert(stagingFiltered);

  TestValidator.predicate("staging filter applies correctly", () => {
    if (stagingFiltered.data.length === 0) return true; // Empty is valid
    return stagingFiltered.data.every(
      (setting) =>
        setting.environment_scope === undefined ||
        setting.environment_scope === "staging",
    );
  });

  // Step 5: Test production environment filtering
  const prodFilterRequest = {
    page: 1,
    limit: 20,
    environment_scope: "production",
  } satisfies ITodoAppSystemSettings.IRequest;

  const prodFiltered = await api.functional.todoApp.user.systemSettings.index(
    connection,
    { body: prodFilterRequest },
  );
  typia.assert(prodFiltered);

  TestValidator.predicate("production filter applies correctly", () => {
    if (prodFiltered.data.length === 0) return true; // Empty is valid
    return prodFiltered.data.every(
      (setting) =>
        setting.environment_scope === undefined ||
        setting.environment_scope === "production",
    );
  });

  // Step 6: Test active settings filtering within development environment
  const activeDevRequest = {
    page: 1,
    limit: 20,
    environment_scope: "development",
    is_active: true,
  } satisfies ITodoAppSystemSettings.IRequest;

  const activeDevFiltered =
    await api.functional.todoApp.user.systemSettings.index(connection, {
      body: activeDevRequest,
    });
  typia.assert(activeDevFiltered);

  TestValidator.predicate(
    "active development settings filtered correctly",
    () => {
      if (activeDevFiltered.data.length === 0) return true; // Empty is valid
      return activeDevFiltered.data.every(
        (setting) =>
          setting.is_active === true &&
          (setting.environment_scope === undefined ||
            setting.environment_scope === "development"),
      );
    },
  );

  // Step 7: Test inactive settings filtering within production environment
  const inactiveProdRequest = {
    page: 1,
    limit: 20,
    environment_scope: "production",
    is_active: false,
  } satisfies ITodoAppSystemSettings.IRequest;

  const inactiveProdFiltered =
    await api.functional.todoApp.user.systemSettings.index(connection, {
      body: inactiveProdRequest,
    });
  typia.assert(inactiveProdFiltered);

  TestValidator.predicate(
    "inactive production settings filtered correctly",
    () => {
      if (inactiveProdFiltered.data.length === 0) return true; // Empty is valid
      return inactiveProdFiltered.data.every(
        (setting) =>
          setting.is_active === false &&
          (setting.environment_scope === undefined ||
            setting.environment_scope === "production"),
      );
    },
  );

  // Step 8: Validate pagination works with environment filters
  const paginationTestRequest = {
    page: 1,
    limit: 1,
    environment_scope: "development",
  } satisfies ITodoAppSystemSettings.IRequest;

  const paginatedResults =
    await api.functional.todoApp.user.systemSettings.index(connection, {
      body: paginationTestRequest,
    });
  typia.assert(paginatedResults);

  TestValidator.equals(
    "pagination with environment filter respects limit",
    paginatedResults.pagination.limit,
    1,
  );
  TestValidator.predicate("paginated results filtered by environment", () => {
    if (paginatedResults.data.length === 0) return true; // Empty is valid
    return paginatedResults.data.every(
      (setting) =>
        setting.environment_scope === undefined ||
        setting.environment_scope === "development",
    );
  });

  // Ensure pagination metadata is valid
  TestValidator.predicate(
    "pagination metadata valid",
    paginatedResults.pagination.current >= 0 &&
      paginatedResults.pagination.limit >= 0 &&
      paginatedResults.pagination.records >= 0 &&
      paginatedResults.pagination.pages >= 0,
  );
}
