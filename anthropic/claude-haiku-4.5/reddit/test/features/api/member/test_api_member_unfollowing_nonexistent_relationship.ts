import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

export async function test_api_member_unfollowing_nonexistent_relationship(
  connection: api.IConnection,
) {
  // Step 1: Create the follower member account
  const followerData = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.alphabets(8),
    password: RandomGenerator.alphabets(10),
    href: "http://localhost:3000/join",
    referrer: "http://localhost:3000",
  } satisfies ICommunityPlatformMember.ICreate;

  const follower = await api.functional.auth.member.join(connection, {
    body: followerData,
  });
  typia.assert(follower);
  TestValidator.predicate(
    "follower member should be created successfully",
    follower.id !== undefined,
  );

  // Step 2: Create the target member account (that will not be followed)
  const targetData = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.alphabets(8),
    password: RandomGenerator.alphabets(10),
    href: "http://localhost:3000/join",
    referrer: "http://localhost:3000",
  } satisfies ICommunityPlatformMember.ICreate;

  const targetMember = await api.functional.auth.member.join(connection, {
    body: targetData,
  });
  typia.assert(targetMember);
  TestValidator.predicate(
    "target member should be created successfully",
    targetMember.id !== undefined,
  );

  // Step 3: Create an additional member for authentication context
  const authMemberData = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.alphabets(8),
    password: RandomGenerator.alphabets(10),
    href: "http://localhost:3000/join",
    referrer: "http://localhost:3000",
  } satisfies ICommunityPlatformMember.ICreate;

  await api.functional.auth.member.join(connection, {
    body: authMemberData,
  });

  // Step 4: Attempt to unfollow a non-existent follow relationship
  // The follower never followed the target, so this should fail with 404
  await TestValidator.error(
    "attempting to unfollow non-existent relationship should fail",
    async () => {
      await api.functional.communityPlatform.members.following.erase(
        connection,
        {
          memberId: follower.id,
          followingId: targetMember.id,
        },
      );
    },
  );
}
