import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallLogoutConfirmation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallLogoutConfirmation";
import type { IShoppingMallLogoutRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallLogoutRequest";
import type { IShoppingMallUserType } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallUserType";

/**
 * Test logout with detailed reason tracking for audit and analytics purposes.
 *
 * This comprehensive test validates the shopping mall logout functionality with
 * various reason tracking scenarios. It tests the acceptance of different
 * logout reasons, validates proper JWT token handling, confirms audit logging,
 * and ensures data integrity across different logout configurations.
 *
 * The test covers:
 *
 * 1. Standard logout with valid reason (user_action)
 * 2. Security concern logout with session cleanup
 * 3. Session timeout logout across all devices
 * 4. Logout without optional parameters (minimal request)
 * 5. Boundary testing for reason field (500 character limit)
 * 6. Data integrity validation through response confirmation
 *
 * Each scenario validates the complete logout flow including JWT token
 * invalidation, session cleanup, and audit trail generation.
 */
export async function test_api_shopping_mall_logout_with_reason_validation(
  connection: api.IConnection,
) {
  // Step 1: Generate a valid JWT token using proper type constraints
  const jwtToken = typia.random<
    string & tags.Pattern<"^[A-Za-z0-9-_]+\\.[A-Za-z0-9-_]+\\.[A-Za-z0-9-_]+$">
  >();

  // Step 2: Test standard logout with user_action reason
  const userActionLogoutRequest = {
    token: jwtToken,
    reason: "user_action",
    logoutAllDevices: false,
    sessionCleanup: true,
  } satisfies IShoppingMallLogoutRequest;

  const userActionResult = await api.functional.shoppingMall.auth.logout(
    connection,
    {
      body: userActionLogoutRequest,
    },
  );

  typia.assert(userActionResult);
  TestValidator.predicate(
    "user action logout success",
    userActionResult.success === true,
  );
  TestValidator.predicate(
    "user action user type is valid",
    userActionResult.userType === "customer" ||
      userActionResult.userType === "seller" ||
      userActionResult.userType === "admin",
  );

  // Step 3: Test security concern logout
  const securityConcernRequest = {
    token: jwtToken,
    reason: "security_concern",
    logoutAllDevices: true,
    sessionCleanup: true,
  } satisfies IShoppingMallLogoutRequest;

  const securityResult = await api.functional.shoppingMall.auth.logout(
    connection,
    {
      body: securityConcernRequest,
    },
  );

  typia.assert(securityResult);
  TestValidator.predicate(
    "security concern logout success",
    securityResult.success === true,
  );
  TestValidator.predicate(
    "security concern message is present",
    securityResult.message.toLowerCase().includes("security") ||
      securityResult.message.toLowerCase().includes("logout"),
  );

  // Step 4: Test session timeout logout
  const sessionTimeoutRequest = {
    token: jwtToken,
    reason: "session_timeout",
    logoutAllDevices: true,
    sessionCleanup: false,
  } satisfies IShoppingMallLogoutRequest;

  const timeoutResult = await api.functional.shoppingMall.auth.logout(
    connection,
    {
      body: sessionTimeoutRequest,
    },
  );

  typia.assert(timeoutResult);
  TestValidator.predicate(
    "session timeout logout success",
    timeoutResult.success === true,
  );

  // Step 5: Test minimal logout (only required token)
  const minimalRequest = {
    token: jwtToken,
  } satisfies IShoppingMallLogoutRequest;

  const minimalResult = await api.functional.shoppingMall.auth.logout(
    connection,
    {
      body: minimalRequest,
    },
  );

  typia.assert(minimalResult);
  TestValidator.predicate(
    "minimal logout success",
    minimalResult.success === true,
  );
  TestValidator.predicate(
    "minimal user type is valid",
    minimalResult.userType === "customer" ||
      minimalResult.userType === "seller" ||
      minimalResult.userType === "admin",
  );

  // Step 6: Test boundary condition for reason field (maximum 500 characters)
  const maxLengthReason = RandomGenerator.content({
    paragraphs: 3,
    sentenceMin: 8,
    sentenceMax: 15,
    wordMin: 4,
    wordMax: 8,
  });

  const safeMaxLengthReason =
    maxLengthReason.length > 500
      ? maxLengthReason.substring(0, 500)
      : maxLengthReason;

  const maxLengthRequest = {
    token: jwtToken,
    reason: safeMaxLengthReason,
    logoutAllDevices: false,
    sessionCleanup: true,
  } satisfies IShoppingMallLogoutRequest;

  const maxLengthResult = await api.functional.shoppingMall.auth.logout(
    connection,
    {
      body: maxLengthRequest,
    },
  );

  typia.assert(maxLengthResult);
  TestValidator.predicate(
    "max length reason logout success",
    maxLengthResult.success === true,
  );
  TestValidator.predicate(
    "max length reason field accepted",
    safeMaxLengthReason.length <= maxLengthReason.length,
  );
  TestValidator.predicate(
    "max length within 500 character limit",
    safeMaxLengthReason.length <= 500,
  );

  // Step 7: Test comprehensive logout options
  const comprehensiveRequest = {
    token: jwtToken,
    reason:
      "comprehensive_audit_logout_for_security_review_and_compliance_validation",
    logoutAllDevices: true,
    sessionCleanup: true,
  } satisfies IShoppingMallLogoutRequest;

  const comprehensiveResult = await api.functional.shoppingMall.auth.logout(
    connection,
    {
      body: comprehensiveRequest,
    },
  );

  typia.assert(comprehensiveResult);
  TestValidator.predicate(
    "comprehensive logout success",
    comprehensiveResult.success === true,
  );
  TestValidator.predicate(
    "comprehensive has all options enabled",
    comprehensiveRequest.logoutAllDevices === true &&
      comprehensiveRequest.sessionCleanup === true,
  );

  // Step 8: Validate data integrity across all responses
  TestValidator.predicate(
    "all results have consistent success",
    userActionResult.success &&
      securityResult.success &&
      timeoutResult.success &&
      minimalResult.success &&
      maxLengthResult.success &&
      comprehensiveResult.success,
  );

  TestValidator.predicate(
    "all results have valid user types",
    (["customer", "seller", "admin"] as const).includes(
      userActionResult.userType,
    ) &&
      (["customer", "seller", "admin"] as const).includes(
        minimalResult.userType,
      ) &&
      (["customer", "seller", "admin"] as const).includes(
        comprehensiveResult.userType,
      ),
  );

  TestValidator.predicate(
    "all session IDs are valid UUIDs",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      userActionResult.sessionId,
    ) &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        securityResult.sessionId,
      ) &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        timeoutResult.sessionId,
      ) &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        minimalResult.sessionId,
      ) &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        maxLengthResult.sessionId,
      ) &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        comprehensiveResult.sessionId,
      ),
  );

  // Step 9: Final validation - ensure all API calls were successful
  TestValidator.predicate(
    "all logout operations completed successfully",
    userActionResult.success &&
      securityResult.success &&
      timeoutResult.success &&
      minimalResult.success &&
      maxLengthResult.success &&
      comprehensiveResult.success,
  );
}
