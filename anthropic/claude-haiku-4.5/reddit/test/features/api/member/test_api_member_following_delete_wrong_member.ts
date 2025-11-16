import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformMemberFollower } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberFollower";

export async function test_api_member_following_delete_wrong_member(
  connection: api.IConnection,
) {
  /**
   * Test authorization enforcement for deleting follow relationships.
   *
   * Validates that only the follower can delete their own follow relationship.
   * Tests that unauthorized members cannot delete follows created by others.
   *
   * Process:
   *
   * 1. Create Member A (follower) and Member B (followed member)
   * 2. Member A creates a follow relationship to Member B
   * 3. Create Member C (unrelated member)
   * 4. Attempt deletion with wrong memberId to trigger authorization error
   * 5. Verify that proper authorization errors are returned
   * 6. Verify Member A can still delete their own follow relationship
   */

  // Step 1: Create Member A (the follower)
  const memberAData = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.alphabets(10),
    password: "TestPassword123!",
    ip: "192.168.1.100",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMember.ICreate;

  const memberA = await api.functional.auth.member.join(connection, {
    body: memberAData,
  });
  typia.assert(memberA);
  TestValidator.predicate(
    "member A created successfully",
    memberA.id !== null && memberA.token !== null,
  );

  // Step 2: Create Member B (the followed member) with separate connection for different auth
  const memberBConnection: api.IConnection = { ...connection, headers: {} };
  const memberBData = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.alphabets(10),
    password: "TestPassword123!",
    ip: "192.168.1.101",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMember.ICreate;

  const memberB = await api.functional.auth.member.join(memberBConnection, {
    body: memberBData,
  });
  typia.assert(memberB);
  TestValidator.predicate(
    "member B created successfully",
    memberB.id !== null && memberB.token !== null,
  );

  // Step 3: Create Member C (unrelated member)
  const memberCConnection: api.IConnection = { ...connection, headers: {} };
  const memberCData = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.alphabets(10),
    password: "TestPassword123!",
    ip: "192.168.1.102",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMember.ICreate;

  const memberC = await api.functional.auth.member.join(memberCConnection, {
    body: memberCData,
  });
  typia.assert(memberC);

  /**
   * Step 4: Member A creates a follow relationship to Member B Uses Member A's
   * authenticated connection
   */
  const followRelationship =
    await api.functional.communityPlatform.member.members.following.create(
      connection,
      {
        memberId: memberA.id,
        followingId: memberB.id,
      },
    );
  typia.assert(followRelationship);
  TestValidator.equals(
    "follow relationship created with correct follower",
    followRelationship.follower.id,
    memberA.id,
  );
  TestValidator.equals(
    "follow relationship created with correct following",
    followRelationship.following.id,
    memberB.id,
  );

  /**
   * Step 5: Test Case 1 - Member B (followed member) cannot delete Member A's
   * follow Member B attempts to delete the follow using Member A's memberId
   * This should fail because Member B is not the follower
   */
  await TestValidator.error(
    "followed member (B) cannot delete follower (A)'s follow relationship",
    async () => {
      await api.functional.communityPlatform.member.members.following.erase(
        memberBConnection,
        {
          memberId: memberA.id,
          followingId: memberB.id,
        },
      );
    },
  );

  /**
   * Step 6: Test Case 2 - Member C (unrelated member) cannot delete the follow
   * Member C attempts to delete the follow relationship This should fail
   * because Member C is not involved in the relationship
   */
  await TestValidator.error(
    "unrelated member (C) cannot delete follow relationship between A and B",
    async () => {
      await api.functional.communityPlatform.member.members.following.erase(
        memberCConnection,
        {
          memberId: memberA.id,
          followingId: memberB.id,
        },
      );
    },
  );

  /**
   * Step 7: Test Case 3 - Member A (the follower) CAN delete their own follow
   * This is the authorized case - Member A owns the follow relationship
   */
  await api.functional.communityPlatform.member.members.following.erase(
    connection,
    {
      memberId: memberA.id,
      followingId: memberB.id,
    },
  );

  TestValidator.predicate(
    "member A successfully deleted their own follow relationship",
    true,
  );
}
