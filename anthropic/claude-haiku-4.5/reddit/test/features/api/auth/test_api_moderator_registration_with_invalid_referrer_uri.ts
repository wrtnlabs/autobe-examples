import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";

/**
 * Test moderator registration with valid referrer URI format.
 *
 * This test validates that the moderator registration endpoint correctly
 * processes registration requests with properly formatted referrer URIs. The
 * API expects both href and referrer fields to be valid URIs conforming to URI
 * format standards. This test ensures successful account creation when all
 * required fields, including referrer, are provided with valid URI format.
 *
 * The test verifies:
 *
 * 1. Moderator account creation succeeds with valid referrer URI
 * 2. Authentication tokens are properly issued
 * 3. Account details are correctly returned
 */
export async function test_api_moderator_registration_with_invalid_referrer_uri(
  connection: api.IConnection,
) {
  // Register a moderator with valid referrer URI
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphabets(8),
        password: RandomGenerator.alphaNumeric(12),
        href: "https://community.example.com/auth/register",
        referrer: "https://referrer.example.com/link",
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);

  // Validate moderator account was created successfully
  TestValidator.predicate(
    "moderator id is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      moderator.id,
    ),
  );

  // Validate moderator has correct username
  TestValidator.predicate(
    "moderator username length is within valid range",
    moderator.username.length >= 3 && moderator.username.length <= 50,
  );

  // Validate email is set
  TestValidator.predicate(
    "moderator email is valid email format",
    /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i.test(
      moderator.email,
    ),
  );

  // Validate account is active
  TestValidator.equals(
    "moderator account status is active",
    moderator.account_status,
    "active",
  );

  // Validate authorization token is present
  TestValidator.predicate(
    "access token is provided",
    moderator.token.access.length > 0,
  );

  TestValidator.predicate(
    "refresh token is provided",
    moderator.token.refresh.length > 0,
  );

  // Validate token expiration times are set
  TestValidator.predicate(
    "access token expiration is set",
    new Date(moderator.token.expired_at) > new Date(),
  );

  TestValidator.predicate(
    "refresh token refreshable until is set",
    new Date(moderator.token.refreshable_until) > new Date(),
  );
}
