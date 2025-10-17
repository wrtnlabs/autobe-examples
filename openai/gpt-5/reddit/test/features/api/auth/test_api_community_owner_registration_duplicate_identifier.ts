import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunityOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityOwner";

/**
 * Ensure community owner registration enforces unique identifiers (email and
 * username).
 *
 * Business flow:
 *
 * 1. Register a new community owner with a unique email and username (happy path).
 * 2. Attempt to register again with the same email but a different username →
 *    expect rejection.
 * 3. Attempt to register again with the same username but a different email →
 *    expect rejection.
 *
 * Validation approach:
 *
 * - Use typia.assert() to validate the successful response shape (IAuthorized).
 * - Use TestValidator.error() to assert duplicates are rejected without checking
 *   specific HTTP codes.
 * - Request bodies are immutable and typed via `satisfies
 *   ICommunityPlatformCommunityOwner.ICreate`.
 */
export async function test_api_community_owner_registration_duplicate_identifier(
  connection: api.IConnection,
) {
  // Create a fresh unauthenticated connection (do not touch headers afterwards)
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // Prepare a valid registration payload
  const nowIso: string = new Date().toISOString();
  const baseEmail: string = typia.random<string & tags.Format<"email">>();
  const baseUsername: string = RandomGenerator.alphaNumeric(12); // conforms to ^[A-Za-z0-9_]{3,20}$

  const createBody = {
    email: baseEmail,
    username: baseUsername,
    password: RandomGenerator.alphaNumeric(12), // 8-64 chars
    display_name: RandomGenerator.name(1),
    avatar_uri: typia.random<string & tags.Format<"uri">>(),
    terms_accepted_at: nowIso,
    privacy_accepted_at: nowIso,
    marketing_opt_in: true,
    marketing_opt_in_at: nowIso,
  } satisfies ICommunityPlatformCommunityOwner.ICreate;

  // 1) Happy path registration
  const authorized: ICommunityPlatformCommunityOwner.IAuthorized =
    await api.functional.auth.communityOwner.join(unauthConn, {
      body: createBody,
    });
  typia.assert(authorized);

  // 2) Duplicate email with different username should fail
  await TestValidator.error(
    "duplicate email should be rejected when username differs",
    async () => {
      const dupEmailBody = {
        email: baseEmail, // same email
        username: RandomGenerator.alphaNumeric(10), // different valid username
        password: RandomGenerator.alphaNumeric(12),
        terms_accepted_at: new Date().toISOString(),
        privacy_accepted_at: new Date().toISOString(),
      } satisfies ICommunityPlatformCommunityOwner.ICreate;

      await api.functional.auth.communityOwner.join(unauthConn, {
        body: dupEmailBody,
      });
    },
  );

  // 3) Duplicate username with different email should fail
  await TestValidator.error(
    "duplicate username should be rejected when email differs",
    async () => {
      const dupUsernameBody = {
        email: typia.random<string & tags.Format<"email">>(), // different email
        username: baseUsername, // same username
        password: RandomGenerator.alphaNumeric(12),
        terms_accepted_at: new Date().toISOString(),
        privacy_accepted_at: new Date().toISOString(),
      } satisfies ICommunityPlatformCommunityOwner.ICreate;

      await api.functional.auth.communityOwner.join(unauthConn, {
        body: dupUsernameBody,
      });
    },
  );
}
