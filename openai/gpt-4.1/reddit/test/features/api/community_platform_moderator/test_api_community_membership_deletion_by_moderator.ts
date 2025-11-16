import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";

/**
 * Test that a moderator can successfully remove a user's membership from a
 * community.
 *
 * Steps:
 *
 * 1. Register moderator1 (authorized moderator), record password and use token
 * 2. Register moderator2 (unrelated moderator), record password and use token
 * 3. Generate a random "communityName" and random "membershipId" (UUID format)
 * 4. As moderator1, invoke the deletion endpoint, ensure it succeeds (no error
 *    thrown)
 * 5. As moderator2 (not assigned to the community), attempt deletion; ensure
 *    permission enforcement (should be forbidden)
 * 6. As moderator1, attempt to delete again; expect error (already deleted / not
 *    found)
 *
 * Limitation: Because there are no membership create/list endpoints, resource
 * existence is simulated and only endpoint behavior and permission logic can be
 * confirmed.
 */
export async function test_api_community_membership_deletion_by_moderator(
  connection: api.IConnection,
) {
  // 1. Register moderator1 and keep credentials
  const moderator1_email = typia.random<string & tags.Format<"email">>();
  const moderator1_password = RandomGenerator.alphaNumeric(12);
  const moderator1 = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderator1_email,
      password: moderator1_password,
      status: "active",
      href: "https://community-platform.test/register",
      referrer: "https://community-platform.test/",
    } satisfies ICommunityPlatformModerator.ICreate,
  });
  typia.assert(moderator1);

  // 2. Register unrelated moderator2
  const moderator2_email = typia.random<string & tags.Format<"email">>();
  const moderator2_password = RandomGenerator.alphaNumeric(12);
  const moderator2 = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderator2_email,
      password: moderator2_password,
      status: "active",
      href: "https://community-platform.test/register",
      referrer: "https://community-platform.test/",
    } satisfies ICommunityPlatformModerator.ICreate,
  });
  typia.assert(moderator2);

  // 3. Resource identity simulation
  const communityName = RandomGenerator.alphaNumeric(10);
  const membershipId = typia.random<string & tags.Format<"uuid">>();

  // 4. As moderator1, attempt to remove community membership -- should succeed
  // (SDK handles token, so moderator1 context is current after prior join)
  await api.functional.communityPlatform.moderator.communities.memberships.erase(
    connection,
    {
      communityName,
      membershipId,
    },
  );

  // 5. As unrelated moderator2, attempt deletion -- should be forbidden
  await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderator2_email,
      password: moderator2_password,
      status: "active",
      href: "https://community-platform.test/register",
      referrer: "https://community-platform.test/",
    } satisfies ICommunityPlatformModerator.ICreate,
  });
  await TestValidator.error(
    "Unrelated moderator must not be able to remove membership (permission enforcement)",
    async () => {
      await api.functional.communityPlatform.moderator.communities.memberships.erase(
        connection,
        {
          communityName,
          membershipId,
        },
      );
    },
  );

  // 6. Switch back to moderator1, attempt repeated deletion -- should error
  await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderator1_email,
      password: moderator1_password,
      status: "active",
      href: "https://community-platform.test/register",
      referrer: "https://community-platform.test/",
    } satisfies ICommunityPlatformModerator.ICreate,
  });
  await TestValidator.error(
    "Moderator cannot remove already deleted membership (idempotency/soft delete)",
    async () => {
      await api.functional.communityPlatform.moderator.communities.memberships.erase(
        connection,
        {
          communityName,
          membershipId,
        },
      );
    },
  );
}
