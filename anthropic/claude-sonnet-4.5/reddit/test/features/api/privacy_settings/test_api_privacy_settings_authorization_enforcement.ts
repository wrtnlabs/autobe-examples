import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeUser";

/**
 * Test privacy settings authorization enforcement.
 *
 * Validates that privacy settings can only be retrieved by the account owner,
 * enforcing proper authorization controls to prevent unauthorized access to
 * sensitive privacy configuration data.
 *
 * Test Flow:
 *
 * 1. Register Member A (whose privacy will be protected)
 * 2. Member A successfully retrieves their own privacy settings (establish
 *    baseline)
 * 3. Register Member B (connection is now authenticated as Member B)
 * 4. Member B attempts to retrieve Member A's privacy settings (should fail)
 * 5. Verify authorization enforcement prevents privacy data leakage
 */
export async function test_api_privacy_settings_authorization_enforcement(
  connection: api.IConnection,
) {
  // Step 1: Register Member A with unique credentials
  const memberAEmail = typia.random<string & tags.Format<"email">>();
  const memberAPassword = typia.random<string & tags.MinLength<8>>();
  const memberAUsername = RandomGenerator.alphaNumeric(10);

  const memberA = await api.functional.auth.member.join(connection, {
    body: {
      username: memberAUsername,
      email: memberAEmail,
      password: memberAPassword,
    } satisfies IRedditLikeMember.ICreate,
  });
  typia.assert(memberA);

  // Step 2: Member A (currently authenticated) successfully retrieves their own privacy settings
  // This establishes the baseline that owners can access their own privacy settings
  const memberAPrivacy =
    await api.functional.redditLike.member.users.privacy.at(connection, {
      userId: memberA.id,
    });
  typia.assert(memberAPrivacy);

  // Verify the privacy settings structure is valid
  TestValidator.predicate(
    "privacy settings should contain profile_privacy field",
    typeof memberAPrivacy.profile_privacy === "string",
  );
  TestValidator.predicate(
    "privacy settings should contain show_karma_publicly field",
    typeof memberAPrivacy.show_karma_publicly === "boolean",
  );
  TestValidator.predicate(
    "privacy settings should contain show_subscriptions_publicly field",
    typeof memberAPrivacy.show_subscriptions_publicly === "boolean",
  );

  // Step 3: Register Member B with different unique credentials
  // The join function will automatically set Member B's authorization token
  const memberBEmail = typia.random<string & tags.Format<"email">>();
  const memberBPassword = typia.random<string & tags.MinLength<8>>();
  const memberBUsername = RandomGenerator.alphaNumeric(10);

  const memberB = await api.functional.auth.member.join(connection, {
    body: {
      username: memberBUsername,
      email: memberBEmail,
      password: memberBPassword,
    } satisfies IRedditLikeMember.ICreate,
  });
  typia.assert(memberB);

  // Step 4: Member B (now authenticated) attempts to access Member A's privacy settings
  // This should fail due to authorization enforcement
  await TestValidator.error(
    "unauthorized access to another member's privacy settings should be rejected",
    async () => {
      await api.functional.redditLike.member.users.privacy.at(connection, {
        userId: memberA.id,
      });
    },
  );
}
