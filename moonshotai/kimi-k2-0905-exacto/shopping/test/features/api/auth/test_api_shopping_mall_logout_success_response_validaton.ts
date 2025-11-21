import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallLogoutConfirmation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallLogoutConfirmation";
import type { IShoppingMallLogoutRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallLogoutRequest";
import type { IShoppingMallUserType } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallUserType";

/**
 * Comprehensive validation of successful logout response structure for shopping
 * mall platform. Tests all required response fields: success boolean, message
 * string, timestamp in ISO 8601 format, sessionId in UUID format, and userType
 * validation for different user contexts. This ensures the API contract
 * consistency is maintained while verifying data type accuracy across customer,
 * seller, and admin user scenarios.
 */
export async function test_api_shopping_mall_logout_success_response_validaton(
  connection: api.IConnection,
) {
  // Step 1: Generate proper JWT token matching expected pattern
  const jwtToken = typia.random<
    string & tags.Pattern<"^[A-Za-z0-9-_]+\\.[A-Za-z0-9-_]+\\.[A-Za-z0-9-_]+$">
  >();

  // Step 2: Create test logout request with optional parameters
  const logoutRequest = {
    token: jwtToken,
    logoutAllDevices: RandomGenerator.pick([true, false] as const),
    reason: RandomGenerator.pick([
      "user_action",
      "security_concern",
      "session_timeout",
    ] as const),
    sessionCleanup: RandomGenerator.pick([true, false] as const),
  } satisfies IShoppingMallLogoutRequest;

  // Step 3: Call logout API
  const logoutResponse = await api.functional.shoppingMall.auth.logout(
    connection,
    {
      body: logoutRequest,
    },
  );

  // Step 4: Validate response structure using typia - this validates all type constraints including formats
  typia.assert(logoutResponse);

  // Step 5: Validate business logic - typia handles type validation, focus on business rules
  TestValidator.predicate(
    "logout success should be true",
    logoutResponse.success === true,
  );

  TestValidator.predicate(
    "logout message should be meaningful",
    logoutResponse.message.length > 0,
  );

  // Step 6: Test with different user type contexts
  const userTypes: IShoppingMallUserType[] = ["customer", "seller", "admin"];

  await ArrayUtil.asyncForEach(userTypes, async (userType) => {
    const userRequest = {
      token: typia.random<
        string &
          tags.Pattern<"^[A-Za-z0-9-_]+\\.[A-Za-z0-9-_]+\\.[A-Za-z0-9-_]+$">
      >(),
      logoutAllDevices: RandomGenerator.pick([true, false] as const),
      reason: "user_action",
      sessionCleanup: true,
    } satisfies IShoppingMallLogoutRequest;

    const userResponse = await api.functional.shoppingMall.auth.logout(
      connection,
      {
        body: userRequest,
      },
    );

    // Validate response structure
    typia.assert(userResponse);

    TestValidator.predicate(
      `${userType} logout should succeed`,
      userResponse.success === true,
    );

    TestValidator.predicate(
      `response should have correct user type`,
      userResponse.userType === userType,
    );
  });

  // Step 7: Validate response consistency across multiple requests
  const responses: IShoppingMallLogoutConfirmation[] =
    await ArrayUtil.asyncRepeat(3, async () => {
      const request = {
        token: typia.random<
          string &
            tags.Pattern<"^[A-Za-z0-9-_]+\\.[A-Za-z0-9-_]+\\.[A-Za-z0-9-_]+$">
        >(),
        logoutAllDevices: false,
        reason: "session_timeout",
        sessionCleanup: false,
      } satisfies IShoppingMallLogoutRequest;

      return await api.functional.shoppingMall.auth.logout(connection, {
        body: request,
      });
    });

  // Validate structural consistency - typia handles format validation
  TestValidator.predicate(
    "all responses should have success status",
    responses.every((response) => response.success === true),
  );

  TestValidator.predicate(
    "all responses should have different session IDs",
    new Set(responses.map((r) => r.sessionId)).size === responses.length,
  );

  TestValidator.predicate(
    "all timestamps should be unique",
    new Set(responses.map((r) => r.timestamp)).size === responses.length,
  );

  // Step 8: Test edge cases with minimal required parameters
  const minimalRequest = {
    token: typia.random<
      string &
        tags.Pattern<"^[A-Za-z0-9-_]+\\.[A-Za-z0-9-_]+\\.[A-Za-z0-9-_]+$">
    >(),
  } satisfies IShoppingMallLogoutRequest;

  const minimalResponse = await api.functional.shoppingMall.auth.logout(
    connection,
    {
      body: minimalRequest,
    },
  );

  typia.assert(minimalResponse);

  TestValidator.predicate(
    "minimal logout request should succeed",
    minimalResponse.success === true,
  );
}
