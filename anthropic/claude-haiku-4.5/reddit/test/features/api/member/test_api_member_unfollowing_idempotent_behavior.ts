import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformMemberFollower } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberFollower";

export async function test_api_member_unfollowing_idempotent_behavior(
  connection: api.IConnection,
) {
  // Step 1: Create the follower member account
  const followerEmail = typia.random<string & tags.Format<"email">>();
  const followerData = {
    email: followerEmail,
    username: RandomGenerator.name(1),
    password: "SecurePass123!",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMember.ICreate;

  const follower = await api.functional.auth.member.join(connection, {
    body: followerData,
  });
  typia.assert(follower);
  const followerId = follower.id;

  // Step 2: Create the following member account
  const followingEmail = typia.random<string & tags.Format<"email">>();
  const followingData = {
    email: followingEmail,
    username: RandomGenerator.name(1),
    password: "SecurePass123!",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMember.ICreate;

  const following = await api.functional.auth.member.join(connection, {
    body: followingData,
  });
  typia.assert(following);
  const followingId = following.id;

  // Step 3: Create the initial follow relationship
  const followRelationship =
    await api.functional.communityPlatform.member.members.following.create(
      connection,
      {
        memberId: followerId,
        followingId: followingId,
      },
    );
  typia.assert(followRelationship);
  TestValidator.equals(
    "follow relationship created successfully",
    followRelationship.follower.id,
    followerId,
  );
  TestValidator.equals(
    "follow relationship created successfully",
    followRelationship.following.id,
    followingId,
  );

  // Step 4: Delete the follow relationship the first time (should succeed)
  await api.functional.communityPlatform.members.following.erase(connection, {
    memberId: followerId,
    followingId: followingId,
  });
  TestValidator.predicate("first unfollow succeeded", true);

  // Step 5: Attempt to delete the same follow relationship again (should fail with not found error)
  await TestValidator.error(
    "second unfollow should fail with not found error",
    async () => {
      await api.functional.communityPlatform.members.following.erase(
        connection,
        {
          memberId: followerId,
          followingId: followingId,
        },
      );
    },
  );
}
