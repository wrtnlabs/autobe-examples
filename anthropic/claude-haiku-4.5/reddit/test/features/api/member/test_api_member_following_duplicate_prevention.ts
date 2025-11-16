import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformMemberFollower } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberFollower";

/**
 * Test that duplicate follow relationships are prevented.
 *
 * This test validates that the unique constraint on the combination of
 * follower_member_id and following_member_id is enforced. The test creates two
 * member accounts, establishes a follow relationship between them, and then
 * attempts to create the same follow relationship again. The second attempt
 * should fail with a conflict error, ensuring data integrity and preventing
 * duplicate entries in the social graph.
 *
 * Steps:
 *
 * 1. Create a follower member account through registration
 * 2. Create a following member account through registration
 * 3. Create the initial follow relationship
 * 4. Attempt to create a duplicate follow relationship
 * 5. Verify the duplicate request fails with an appropriate error
 */
export async function test_api_member_following_duplicate_prevention(
  connection: api.IConnection,
) {
  // Step 1: Create follower member account
  const followerData = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.alphabets(10),
    password: "TestPassword123!",
    ip: "192.168.1.1",
    href: "http://localhost:3000/register" as string & tags.Format<"uri">,
    referrer: "" as string & tags.Format<"uri">,
  } satisfies ICommunityPlatformMember.ICreate;

  const followerAccount = await api.functional.auth.member.join(connection, {
    body: followerData,
  });
  typia.assert(followerAccount);
  const followerId = followerAccount.id;

  // Step 2: Create following member account
  const followingData = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.alphabets(10),
    password: "TestPassword123!",
    ip: "192.168.1.2",
    href: "http://localhost:3000/register" as string & tags.Format<"uri">,
    referrer: "" as string & tags.Format<"uri">,
  } satisfies ICommunityPlatformMember.ICreate;

  const followingAccount = await api.functional.auth.member.join(connection, {
    body: followingData,
  });
  typia.assert(followingAccount);
  const followingId = followingAccount.id;

  // Step 3: Create initial follow relationship
  const initialFollow =
    await api.functional.communityPlatform.member.members.following.create(
      connection,
      {
        memberId: followerId,
        followingId: followingId,
      },
    );
  typia.assert(initialFollow);
  TestValidator.equals(
    "initial follow relationship created successfully",
    initialFollow.follower.id,
    followerId,
  );
  TestValidator.equals(
    "initial follow relationship points to correct following member",
    initialFollow.following.id,
    followingId,
  );

  // Step 4: Attempt to create duplicate follow relationship
  await TestValidator.error(
    "duplicate follow relationship should fail with conflict error",
    async () => {
      await api.functional.communityPlatform.member.members.following.create(
        connection,
        {
          memberId: followerId,
          followingId: followingId,
        },
      );
    },
  );
}
