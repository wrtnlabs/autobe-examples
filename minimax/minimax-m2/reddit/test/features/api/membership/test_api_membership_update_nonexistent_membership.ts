import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityMembership";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";

/**
 * Test membership update behavior when attempting to update a membership that
 * doesn't exist. User should receive appropriate error response when trying to
 * update membership permissions for a non-existent membership record. Verify
 * error handling for invalid membership IDs and proper HTTP status codes.
 */
export async function test_api_membership_update_nonexistent_membership(
  connection: api.IConnection,
) {
  // Step 1: Create a registered user for authentication prerequisite
  const user: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: typia.random<
          string & tags.MinLength<3> & tags.MaxLength<20>
        >(),
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.MinLength<8>>(),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditPlatformRegisteredUser.ICreate,
    });
  typia.assert(user);

  // Step 2: Generate a UUID for a non-existent membership
  const nonExistentMembershipId = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Attempt to update the non-existent membership and verify error handling
  await TestValidator.error(
    "should return error when updating non-existent membership",
    async () => {
      await api.functional.redditPlatform.memberships.update(connection, {
        membershipId: nonExistentMembershipId,
        body: {
          post_permissions: false,
          comment_permissions: true,
          vote_permissions: true,
        } satisfies IRedditPlatformCommunityMembership.IUpdate,
      });
    },
  );
}
