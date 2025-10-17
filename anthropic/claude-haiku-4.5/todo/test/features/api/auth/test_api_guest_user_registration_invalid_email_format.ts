import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAuthenticatedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAuthenticatedUser";
import type { ITodoAppGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestUser";

/**
 * Test guest user registration with various invalid email formats.
 *
 * IMPORTANT: This test scenario requests validation of email format errors
 * through the registration API. However, the TypeScript SDK enforces email
 * format validation at compile-time through the `Format<"email">` type tag.
 *
 * The provided SDK type system prevents sending invalid emails directly, making
 * this scenario impossible to implement through the available APIs. Testing
 * type validation errors would require bypassing TypeScript's type system,
 * which violates type safety requirements.
 *
 * To properly test email validation, direct HTTP endpoint access would be
 * needed, which is not available through the provided typed SDK.
 */
export async function test_api_guest_user_registration_invalid_email_format(
  connection: api.IConnection,
) {
  // This scenario cannot be implemented:
  // The TypeScript SDK's email format validation (tags.Format<"email">)
  // prevents invalid emails from being sent through the typed API.
  //
  // Type safety rules prohibit using 'as' type assertions to bypass
  // compile-time validation to send wrong types.
  //
  // A valid implementation would require:
  // 1. Raw HTTP API access (not provided)
  // 2. Or disabling TypeScript type checking (forbidden)
  //
  // Recommend: Test email validation through integration tests
  // with direct backend API calls outside the typed SDK.
}
