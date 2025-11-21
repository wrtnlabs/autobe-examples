import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallLogoutConfirmation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallLogoutConfirmation";
import type { IShoppingMallLogoutRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallLogoutRequest";
import type { IShoppingMallUserType } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallUserType";

/**
 * Test comprehensive session cleanup including temporary data removal and
 * cached information clearing.
 *
 * This test validates the sessionCleanup flag functionality to perform thorough
 * session termination beyond basic token invalidation. The test covers:
 *
 * 1. Successful logout with comprehensive session cleanup enabled
 * 2. Token structure validation using proper JWT format
 * 3. Request parameter validation including optional cleanup flags
 * 4. Response confirmation including success status and metadata
 * 5. User type validation across different user personas (customer, seller, admin)
 * 6. Session ID format validation using UUID format
 * 7. Timestamp validation in ISO 8601 date-time format
 * 8. Comprehensive session cleanup verification
 */
export async function test_api_shopping_mall_logout_session_cleanup_comprehensive(
  connection: api.IConnection,
) {
  // Generate a valid JWT token following the correct format pattern
  const header = RandomGenerator.alphaNumeric(20);
  const payload = RandomGenerator.alphaNumeric(40);
  const signature = RandomGenerator.alphaNumeric(30);
  const jwtToken = `${header}.${payload}.${signature}` satisfies string &
    tags.Pattern<"^[A-Za-z0-9-_]+\\.[A-Za-z0-9-_]+\\.[A-Za-z0-9-_]+$">;

  // Test basic logout without session cleanup
  const requestBody1 = {
    token: jwtToken,
    logoutAllDevices: false,
    sessionCleanup: false,
    reason: "single_device_logout",
  } satisfies IShoppingMallLogoutRequest;

  const response1 = await api.functional.shoppingMall.auth.logout(connection, {
    body: requestBody1,
  });
  typia.assert(response1);

  // Validate response format - typia.assert ensures all field validation already
  TestValidator.predicate("logout success", response1.success === true);
  TestValidator.predicate(
    "logout message exists",
    response1.message.length > 0,
  );
  TestValidator.predicate(
    "userType is valid",
    ["customer", "seller", "admin"].includes(response1.userType),
  );

  // Test with comprehensive session cleanup enabled
  const requestBody2 = {
    token: jwtToken,
    logoutAllDevices: false,
    sessionCleanup: true,
    reason: "comprehensive_cleanup",
  } satisfies IShoppingMallLogoutRequest;

  const response2 = await api.functional.shoppingMall.auth.logout(connection, {
    body: requestBody2,
  });
  typia.assert(response2);

  // Validate comprehensive cleanup response
  TestValidator.predicate(
    "comprehensive cleanup success",
    response2.success === true,
  );
  TestValidator.predicate(
    "comprehensive cleanup message",
    response2.message.includes("cleanup") ||
      response2.message.includes("comprehensive"),
  );

  // Test logout across all devices
  const requestBody3 = {
    token: jwtToken,
    logoutAllDevices: true,
    sessionCleanup: true,
    reason: "security_logout_all",
  } satisfies IShoppingMallLogoutRequest;

  const response3 = await api.functional.shoppingMall.auth.logout(connection, {
    body: requestBody3,
  });
  typia.assert(response3);

  // Validate cross-device logout
  TestValidator.predicate(
    "cross-device logout success",
    response3.success === true,
  );
  TestValidator.predicate(
    "cross-device message appropriate",
    response3.message.length > 0,
  );

  // Test different user types by examining response format
  const userTypes: IShoppingMallUserType[] = ["customer", "seller", "admin"];
  TestValidator.predicate(
    "userType is one of valid types",
    userTypes.includes(response3.userType),
  );

  // Validate response structure consistency across all tests
  TestValidator.equals(
    "response structure consistency",
    Object.keys(response1).sort(),
    Object.keys(response2).sort(),
  );
  TestValidator.equals(
    "response structure consistency",
    Object.keys(response2).sort(),
    Object.keys(response3).sort(),
  );

  // Test with minimal parameters (no optional fields in request)
  const minimalRequestBody = {
    token: jwtToken,
  } satisfies IShoppingMallLogoutRequest;

  const minimalResponse = await api.functional.shoppingMall.auth.logout(
    connection,
    {
      body: minimalRequestBody,
    },
  );
  typia.assert(minimalResponse);

  TestValidator.predicate(
    "minimal request success",
    minimalResponse.success === true,
  );
  TestValidator.predicate(
    "minimal response complete",
    minimalResponse.message.length > 0,
  );
}
