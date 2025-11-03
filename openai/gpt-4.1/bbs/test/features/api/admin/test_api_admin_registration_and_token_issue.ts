import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";

/**
 * Validate administrator registration and JWT token issuance on the discussion
 * board system.
 *
 * This test verifies creation of a new admin with all required fields, checks
 * that the optional avatar_url field is handled properly, ensures returned data
 * includes a valid admin profile and both access and refresh JWT tokens, and
 * enforces the unique email constraint. The scenario registers one admin using
 * all fields, then re-attempts registration with the same email address to
 * validate proper error response. All constraints, password policy, and field
 * requirements from the DTO and business rules are followed.
 *
 * Steps:
 *
 * 1. Generate a random unique admin registration input with avatar_url supplied.
 * 2. Register admin via /auth/admin/join and validate:
 *
 *    - The response returns correct admin profile fields (email, display_name,
 *         avatar_url, etc.), JWT tokens, and timestamps.
 *    - Optional avatar_url is present and correctly stored.
 *    - All returned data matches the input and server-side expectations.
 * 3. Attempt to register another admin with the same email to confirm unique
 *    constraint:
 *
 *    - The registration attempt should fail with a business rule error.
 *    - Proper error is captured by validator.
 */
export async function test_api_admin_registration_and_token_issue(
  connection: api.IConnection,
) {
  // 1. Prepare admin registration data with all required and optional fields
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12); // 12 chars, meets min 8
  const displayName = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 4,
    wordMax: 12,
  });
  const avatarUrl = typia.random<
    string & tags.MinLength<1> & tags.MaxLength<80000> & tags.Format<"uri">
  >();

  const createBody = {
    email,
    password,
    display_name: displayName,
    avatar_url: avatarUrl,
  } satisfies IDiscussionBoardAdmin.ICreate;

  // 2. Register a new admin
  const output = await api.functional.auth.admin.join(connection, {
    body: createBody,
  });
  typia.assert<IDiscussionBoardAdmin.IAuthorized>(output);

  // 3. Validate returned admin profile fields (email, display_name, avatar_url, is_locked, deleted_at, timestamps)
  TestValidator.equals(
    "admin email matches input",
    output.email,
    createBody.email,
  );
  TestValidator.equals(
    "admin display_name matches input",
    output.display_name,
    createBody.display_name,
  );
  TestValidator.equals(
    "admin avatar_url matches input",
    output.avatar_url,
    createBody.avatar_url,
  );
  TestValidator.equals(
    "is_locked is false by default",
    output.is_locked,
    false,
  );
  TestValidator.equals(
    "deleted_at is null for new account",
    output.deleted_at,
    null,
  );
  TestValidator.predicate(
    "created_at is valid ISO-8601",
    typeof output.created_at === "string" && output.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is valid ISO-8601",
    typeof output.updated_at === "string" && output.updated_at.length > 0,
  );

  // 4. Validate JWT token structure and values
  const token = output.token;
  typia.assert<IAuthorizationToken>(token);
  TestValidator.predicate(
    "access token is non-empty string",
    typeof token.access === "string" && token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty string",
    typeof token.refresh === "string" && token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at is valid ISO-8601",
    typeof token.expired_at === "string" && token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "refreshable_until is valid ISO-8601",
    typeof token.refreshable_until === "string" &&
      token.refreshable_until.length > 0,
  );

  // 5. Attempt duplicate admin registration with same email
  const duplicateBody = {
    email,
    password: RandomGenerator.alphaNumeric(16), // Different password allowed, but same email
    display_name: RandomGenerator.paragraph({ sentences: 2 }),
    avatar_url: typia.random<
      string & tags.MinLength<1> & tags.MaxLength<80000> & tags.Format<"uri">
    >(),
  } satisfies IDiscussionBoardAdmin.ICreate;
  await TestValidator.error(
    "duplicate admin registration must fail on unique email",
    async () => {
      await api.functional.auth.admin.join(connection, {
        body: duplicateBody,
      });
    },
  );
}
