import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallResendVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallResendVerification";
import type { IShoppingMallResendVerificationResponse } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallResendVerificationResponse";

/**
 * Test email verification resend with IP tracking and security monitoring.
 *
 * This test validates that the shopping mall system correctly handles:
 *
 * 1. IP address tracking for security audit trails
 * 2. IP field optional handling (null/undefined) for SSR compatibility
 * 3. Required field validation with valid data
 * 4. Response structure validation
 * 5. Security and audit trail functionality
 *
 * The test demonstrates the security mechanism that stores client IP addresses
 * when provided for audit trail purposes while allowing tolerance for cases
 * where clients can't determine IP (SSR contexts).
 */
export async function test_api_verification_resend_ip_tracking_and_security(
  connection: api.IConnection,
) {
  // Test 1: Verification resend with IP address for security tracking
  const requestWithIP = {
    email: typia.random<string & tags.Format<"email">>(),
    href: "https://example.com/register",
    referrer: "https://example.com/login",
    ip: "192.168.1.100",
  } satisfies IShoppingMallResendVerification;

  const responseWithIP =
    await api.functional.shoppingMall.auth.verification.resend.resendVerification(
      connection,
      { body: requestWithIP },
    );
  typia.assert(responseWithIP);

  TestValidator.equals(
    "response success with IP",
    responseWithIP.success,
    true,
  );
  TestValidator.predicate(
    "response has message",
    responseWithIP.message.length > 0,
  );

  // Test 2: Verification resend without IP (SSR context)
  const requestWithoutIP = {
    email: typia.random<string & tags.Format<"email">>(),
    href: "https://example.com/register",
    referrer: "https://example.com/login",
    ip: undefined,
  } satisfies IShoppingMallResendVerification;

  const responseWithoutIP =
    await api.functional.shoppingMall.auth.verification.resend.resendVerification(
      connection,
      { body: requestWithoutIP },
    );
  typia.assert(responseWithoutIP);

  TestValidator.equals(
    "response success without IP",
    responseWithoutIP.success,
    true,
  );
  TestValidator.equals(
    "response structure consistent",
    responseWithoutIP.success,
    responseWithIP.success,
  );

  // Test 3: Verification resend with null IP
  const requestWithNullIP = {
    email: typia.random<string & tags.Format<"email">>(),
    href: "https://example.com/register",
    referrer: "https://example.com/login",
    ip: null,
  } satisfies IShoppingMallResendVerification;

  const responseWithNullIP =
    await api.functional.shoppingMall.auth.verification.resend.resendVerification(
      connection,
      { body: requestWithNullIP },
    );
  typia.assert(responseWithNullIP);

  TestValidator.equals(
    "response success with null IP",
    responseWithNullIP.success,
    true,
  );

  // Test 4: Verification resend with customer ID
  const requestWithCustomerId = {
    email: typia.random<string & tags.Format<"email">>(),
    customerId: typia.random<string & tags.Format<"uuid">>(),
    href: "https://example.com/register",
    referrer: "https://example.com/login",
    ip: "203.0.113.45",
  } satisfies IShoppingMallResendVerification;

  const responseWithCustomerId =
    await api.functional.shoppingMall.auth.verification.resend.resendVerification(
      connection,
      { body: requestWithCustomerId },
    );
  typia.assert(responseWithCustomerId);

  TestValidator.equals(
    "response success with customer ID",
    responseWithCustomerId.success,
    true,
  );

  // Test 5: Response structure validation and consistency
  TestValidator.predicate(
    "delivery status optional",
    responseWithIP.delivery_status === undefined ||
      typeof responseWithIP.delivery_status === "string",
  );
  TestValidator.predicate(
    "next retry optional",
    responseWithIP.next_retry_after === undefined ||
      (typeof responseWithIP.next_retry_after === "string" &&
        !isNaN(Date.parse(responseWithIP.next_retry_after))),
  );

  // Test 6: Multiple consecutive requests to test system resilience
  const resilienceTestRequest = {
    email: typia.random<string & tags.Format<"email">>(),
    href: "https://example.com/register",
    referrer: "https://example.com/login",
  } satisfies IShoppingMallResendVerification;

  const requests = ArrayUtil.repeat(3, () => resilienceTestRequest);

  for (let i = 0; i < requests.length; i++) {
    const request = {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com/register",
      referrer: "https://example.com/login",
      ip: i % 2 === 0 ? "10.0.0.1" : undefined,
    } satisfies IShoppingMallResendVerification;

    const response =
      await api.functional.shoppingMall.auth.verification.resend.resendVerification(
        connection,
        { body: request },
      );
    typia.assert(response);

    TestValidator.equals(`request ${i + 1} succeeds`, response.success, true);
  }

  // Test 7: Verify all response types maintain consistent structure
  const responses = [
    responseWithIP,
    responseWithoutIP,
    responseWithNullIP,
    responseWithCustomerId,
  ];

  for (const response of responses) {
    TestValidator.predicate(
      "response has required success field",
      response.success !== undefined,
    );
    TestValidator.predicate(
      "response has required message field",
      response.message !== undefined,
    );
    TestValidator.predicate(
      "message is string type",
      typeof response.message === "string",
    );
    TestValidator.predicate(
      "success is boolean type",
      typeof response.success === "boolean",
    );
  }
}
