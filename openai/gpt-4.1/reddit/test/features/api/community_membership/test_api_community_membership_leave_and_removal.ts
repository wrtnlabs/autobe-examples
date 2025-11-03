import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembership";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";

/**
 * Test that a user can leave (remove) a community by deleting their membership,
 * with correct business logic and error handling.
 *
 * Steps performed:
 *
 * 1. Register a new user (as member).
 * 2. Create a new community with that user.
 * 3. Join the community (membership create).
 * 4. Leave the community by deleting the membership (membership erase).
 * 5. Verify that further attempts to delete the same membership result in error.
 * 6. Try deleting a non-existent membership (randomized UUID).
 * 7. (Optional if admin existed:) Ensure unauthorized user can't delete someone
 *    else's membership (not implemented).
 *
 * All validation is performed using available API and DTOs only.
 */
export async function test_api_community_membership_leave_and_removal(
  connection: api.IConnection,
) {
  // 1. Register a new user
  const userEmail = typia.random<string & tags.Format<"email">>();
  const joinUser = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: RandomGenerator.alphaNumeric(10),
      display_name: RandomGenerator.name(),
      href: "https://test-community.com/register",
      referrer: "https://test-community.com",
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(joinUser);
  TestValidator.equals("registered user email", joinUser.email, userEmail);

  // 2. Create a new community
  const communityName = RandomGenerator.alphabets(12).toLowerCase();
  const createCommunity =
    await api.functional.communityPlatform.user.communities.create(connection, {
      body: {
        name: communityName satisfies string,
        description: RandomGenerator.paragraph({
          sentences: 5,
          wordMin: 5,
          wordMax: 10,
        }),
      } satisfies ICommunityPlatformCommunity.ICreate,
    });
  typia.assert(createCommunity);
  TestValidator.equals("community name", createCommunity.name, communityName);

  // 3. Join the created community
  const membership =
    await api.functional.communityPlatform.user.communities.memberships.create(
      connection,
      {
        communityId: createCommunity.id,
        body: {} satisfies ICommunityPlatformCommunityMembership.ICreate,
      },
    );
  typia.assert(membership);
  TestValidator.equals("membership user", membership.user.id, joinUser.id);
  TestValidator.equals(
    "membership community",
    membership.community.id,
    createCommunity.id,
  );

  // 4. Leave the community (erase membership)
  await api.functional.communityPlatform.user.communities.memberships.erase(
    connection,
    {
      communityId: createCommunity.id,
      membershipId: membership.id,
    },
  );

  // 5. Further deletion of same membership should error
  await TestValidator.error("cannot delete membership twice", async () => {
    await api.functional.communityPlatform.user.communities.memberships.erase(
      connection,
      {
        communityId: createCommunity.id,
        membershipId: membership.id,
      },
    );
  });

  // 6. Attempt to delete a non-existent membership
  const randomMembershipId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "cannot delete non-existent membership",
    async () => {
      await api.functional.communityPlatform.user.communities.memberships.erase(
        connection,
        {
          communityId: createCommunity.id,
          membershipId: randomMembershipId,
        },
      );
    },
  );

  // Note: If there was an admin or other user API, should test unauthorized membership removal, but only a user's own removal is implemented as per available APIs.
}
