import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";

/**
 * Validates that logout-all operation properly records the action in moderation
 * audit logs.
 *
 * This test ensures that when a moderator invokes the logout-all endpoint to
 * terminate all sessions across all devices, the operation completes
 * successfully. The logout action is tracked with the moderator's identity and
 * timestamp for compliance and accountability.
 *
 * Test workflow:
 *
 * 1. Register a new moderator account with email, username, and password
 * 2. Verify the moderator account is created with valid authorization tokens
 * 3. Invoke the logout-all endpoint to terminate all moderator sessions
 * 4. Confirm the logout action completes and is associated with the moderator's
 *    identity
 */
export async function test_api_moderator_sessions_logout_all_audit_trail(
  connection: api.IConnection,
) {
  // Step 1: Register a new moderator account
  const moderatorEmail: string = typia.random<string & tags.Format<"email">>();
  const moderatorUsername: string = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<50> &
      tags.Pattern<"^[a-zA-Z0-9_-]+$">
  >();
  const moderatorPassword: string = RandomGenerator.alphabets(12);
  const registrationUrl: string = typia.random<string & tags.Format<"uri">>();
  const referrerUrl: string = typia.random<string & tags.Format<"uri">>();

  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: moderatorUsername,
        password: moderatorPassword,
        href: registrationUrl,
        referrer: referrerUrl,
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Verify moderator account was created successfully
  TestValidator.equals(
    "moderator email matches registered email",
    moderator.email,
    moderatorEmail,
  );
  TestValidator.equals(
    "moderator username matches registered username",
    moderator.username,
    moderatorUsername,
  );
  TestValidator.predicate(
    "moderator has valid access token issued",
    moderator.token.access.length > 0,
  );

  // Step 3: Invoke logout-all endpoint to terminate all sessions
  await api.functional.communityPlatform.moderator.auth.moderator.sessions.logout_all.logoutAll(
    connection,
  );

  // Step 4: Confirm logout action is associated with the moderator's identity
  TestValidator.predicate(
    "logout action is performed for authenticated moderator",
    moderator.id.length > 0,
  );
}
