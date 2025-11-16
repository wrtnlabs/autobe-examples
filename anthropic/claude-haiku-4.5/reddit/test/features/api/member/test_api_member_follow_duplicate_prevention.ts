import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformMemberFollower } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberFollower";

export async function test_api_member_follow_duplicate_prevention(
  connection: api.IConnection,
) {
  // Step 1: Create first member account (follower)
  const followerEmail = typia.random<string & tags.Format<"email">>();
  const followerData = {
    email: followerEmail,
    username: RandomGenerator.alphaNumeric(8),
    password: "TestPassword123!",
    ip: "127.0.0.1",
    href: "https://localhost:3000",
    referrer: "https://localhost:3000",
  } satisfies ICommunityPlatformMember.ICreate;

  const follower = await api.functional.auth.member.join(connection, {
    body: followerData,
  });
  typia.assert(follower);

  // Step 2: Create second member account (following/target)
  const followingEmail = typia.random<string & tags.Format<"email">>();
  const followingData = {
    email: followingEmail,
    username: RandomGenerator.alphaNumeric(8),
    password: "TestPassword123!",
    ip: "127.0.0.1",
    href: "https://localhost:3000",
    referrer: "https://localhost:3000",
  } satisfies ICommunityPlatformMember.ICreate;

  const following = await api.functional.auth.member.join(connection, {
    body: followingData,
  });
  typia.assert(following);

  // Step 3: Create initial follow relationship (member A follows member B)
  const initialFollowRelationship =
    await api.functional.communityPlatform.member.members.following.create(
      connection,
      {
        memberId: follower.id,
        followingId: following.id,
      },
    );
  typia.assert(initialFollowRelationship);

  TestValidator.equals(
    "initial follow relationship created with correct follower",
    initialFollowRelationship.follower.id,
    follower.id,
  );
  TestValidator.equals(
    "initial follow relationship created with correct following",
    initialFollowRelationship.following.id,
    following.id,
  );

  // Step 4: Attempt to create duplicate follow relationship
  // This should fail with a 409 Conflict error or similar
  await TestValidator.error(
    "duplicate follow relationship should fail",
    async () => {
      await api.functional.communityPlatform.member.members.following.create(
        connection,
        {
          memberId: follower.id,
          followingId: following.id,
        },
      );
    },
  );

  TestValidator.predicate(
    "test completed successfully - duplicate follow prevention is working",
    true,
  );
}
