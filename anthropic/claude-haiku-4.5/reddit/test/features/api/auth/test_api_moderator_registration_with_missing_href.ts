import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";

/**
 * Test moderator registration with all required fields properly provided.
 *
 * This test validates that the moderator registration endpoint successfully
 * creates a moderator account when all required fields are properly supplied.
 * It verifies the complete registration flow including field validation and
 * token generation.
 *
 * Test workflow:
 *
 * 1. Prepare complete and valid moderator registration data with all required
 *    fields
 * 2. Call the moderator join endpoint with properly formatted request
 * 3. Verify successful registration and authentication token response
 * 4. Confirm the moderator account is created with correct initial state
 */
export async function test_api_moderator_registration_with_missing_href(
  connection: api.IConnection,
) {
  // Prepare complete and valid registration data with all required fields
  const email = typia.random<string & tags.Format<"email">>();
  const username = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<50> &
      tags.Pattern<"^[a-zA-Z0-9_-]+$">
  >();
  const password = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 8,
    wordMax: 12,
  });
  const referrer = typia.random<string & tags.Format<"uri">>();
  const href = typia.random<string & tags.Format<"uri">>();

  // Register moderator with all required fields properly provided
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: email,
      username: username,
      password: password,
      referrer: referrer,
      href: href,
    } satisfies ICommunityPlatformModerator.ICreate,
  });

  // Verify the registration response contains all expected moderator information
  typia.assert(moderator);
  TestValidator.equals("moderator email matches input", moderator.email, email);
  TestValidator.equals(
    "moderator username matches input",
    moderator.username,
    username,
  );
  TestValidator.predicate(
    "moderator ID is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      moderator.id,
    ),
  );
  TestValidator.predicate(
    "moderator account is active",
    moderator.account_status === "active",
  );
  TestValidator.predicate(
    "moderator email is not yet verified",
    moderator.email_verified === false,
  );
  TestValidator.predicate(
    "moderator has valid karma score",
    moderator.karma_score >= 0,
  );
  TestValidator.predicate(
    "moderator has access token",
    moderator.token.access.length > 0,
  );
  TestValidator.predicate(
    "moderator has refresh token",
    moderator.token.refresh.length > 0,
  );
}
