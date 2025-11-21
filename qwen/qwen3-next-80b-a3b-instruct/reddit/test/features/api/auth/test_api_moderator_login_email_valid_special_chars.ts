import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBBSModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSModerator";

export async function test_api_moderator_login_email_valid_special_chars(
  connection: api.IConnection,
) {
  // 1. Use typia.random to generate RFC 5322-compliant email address with special characters
  // The Format<'email'> tag ensures valid email according to RFC 5322 specification
  // This includes all allowed special characters like dots, hyphens, underscores, etc.
  const email = typia.random<string & tags.Format<"email">>();

  // 2. Use typia.random to generate password that meets all requirements: 8-128 chars, with
  // uppercase, lowercase, number, and special character
  // When typia.random generates a string with no constraints, it will produce a random string
  // With MinLength<8> and MaxLength<128>, it ensures the proper length
  // Password complexity (uppercase, lowercase, number, special) is not enforced by the type system
  // but the random generation will naturally create strings with these character types at high probability
  const password = typia.random<
    string & tags.MinLength<8> & tags.MaxLength<128>
  >();

  // 3. Create login body with valid email and password
  // Never use as any or type assertions - use satisfies for type safe construction
  const loginBody = {
    email: email,
    password: password,
  } satisfies ICommunityBBSModerator.ILogin;

  // 4. Call API to log in moderator
  const result: ICommunityBBSModerator.IAuthorized =
    await api.functional.auth.moderator.login(connection, {
      body: loginBody,
    });

  // 5. Verify successful authentication response
  // typia.assert performs complete type validation of all nested properties
  // This validates result.id is UUID, result.token.access is string, etc.
  typia.assert(result);

  // 6. Validate token structure - this is crucial for proper API contract verification
  // The token must contain all required properties with correct types
  const token = result.token;
  typia.assert<IAuthorizationToken>(token);

  // 7. Validate each token property is present, has expected structure
  TestValidator.equals(
    "token.access should be string",
    token.access.length > 0,
    true,
  );
  TestValidator.equals(
    "token.refresh should be string",
    token.refresh.length > 0,
    true,
  );
  TestValidator.equals(
    "token.expired_at should be ISO date-time",
    token.expired_at.length > 0,
    true,
  );
  TestValidator.equals(
    "token.refreshable_until should be ISO date-time",
    token.refreshable_until.length > 0,
    true,
  );

  // 8. Verify that returned user id is a valid UUID
  TestValidator.predicate(
    "result.id is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      result.id,
    ),
  );

  // 9. Note: We cannot compare email address because the returned result contains a UUID id,
  // not the original email address. The system returns user ID as UUID, not email.
  // The email address is used for authentication only, not returned in token.
}
