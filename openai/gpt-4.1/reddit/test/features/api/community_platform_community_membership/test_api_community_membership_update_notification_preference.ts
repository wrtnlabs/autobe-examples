import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembership";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";

/**
 * Test updating a user's membership (joined_at) for an existing community.
 *
 * Steps:
 *
 * 1. Register user (User A) and create a community as this user.
 * 2. User A joins the community, producing a membership.
 * 3. Update membership's joined_at, assert actual change.
 * 4. Attempt to update with non-existent membershipId – expect error.
 * 5. Register a second user (User B); try to update user A's membership as user B
 *    – expect error.
 */
export async function test_api_community_membership_update_notification_preference(
  connection: api.IConnection,
) {
  // 1. Register primary user
  const userJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    display_name: RandomGenerator.name(),
    href: "https://test.example.com/auth/join",
    referrer: "https://test.example.com/",
  } satisfies ICommunityPlatformUser.IJoin;
  const userA = await api.functional.auth.user.join(connection, {
    body: userJoinBody,
  });
  typia.assert(userA);

  // 2. Create community as User A
  const communityCreateBody = {
    name: RandomGenerator.alphabets(8),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community =
    await api.functional.communityPlatform.user.communities.create(connection, {
      body: communityCreateBody,
    });
  typia.assert(community);

  // 3. User A joins the created community
  const membership =
    await api.functional.communityPlatform.user.communities.memberships.create(
      connection,
      {
        communityId: community.id,
        body: {},
      },
    );
  typia.assert(membership);

  // 4. Update membership (joined_at: new value)
  const newJoinedAt = new Date(Date.now() + 10000).toISOString();
  const updated =
    await api.functional.communityPlatform.user.communities.memberships.update(
      connection,
      {
        communityId: community.id,
        membershipId: membership.id,
        body: {
          joined_at: newJoinedAt,
        } satisfies ICommunityPlatformCommunityMembership.IUpdate,
      },
    );
  typia.assert(updated);
  TestValidator.notEquals(
    "membership joined_at should be updated",
    updated.joined_at,
    membership.joined_at,
  );
  TestValidator.equals(
    "membership joined_at matches update request",
    updated.joined_at,
    newJoinedAt,
  );

  // 5. Attempt to update with non-existent membershipId
  await TestValidator.error(
    "updating non-existent membershipId should fail",
    async () => {
      await api.functional.communityPlatform.user.communities.memberships.update(
        connection,
        {
          communityId: community.id,
          membershipId: typia.random<string & tags.Format<"uuid">>(), // Random/nonexistent
          body: {
            joined_at: new Date(Date.now() + 30_000).toISOString(),
          } satisfies ICommunityPlatformCommunityMembership.IUpdate,
        },
      );
    },
  );

  // 6. Register another user (User B)
  const userBJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    display_name: RandomGenerator.name(),
    href: "https://test.example.com/auth/join",
    referrer: "https://test.example.com/",
  } satisfies ICommunityPlatformUser.IJoin;
  const userB = await api.functional.auth.user.join(connection, {
    body: userBJoinBody,
  });
  typia.assert(userB);

  // 7. User B (another user) attempts to update User A's membership
  await TestValidator.error(
    "other user cannot update membership they do not own",
    async () => {
      await api.functional.communityPlatform.user.communities.memberships.update(
        connection,
        {
          communityId: community.id,
          membershipId: membership.id,
          body: {
            joined_at: new Date(Date.now() + 66666).toISOString(),
          } satisfies ICommunityPlatformCommunityMembership.IUpdate,
        },
      );
    },
  );
}
