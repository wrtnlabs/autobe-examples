import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformMemberFollower } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberFollower";

export async function test_api_member_follow_self_prevention(
  connection: api.IConnection,
) {
  // 1. Create first member account for self-follow attempt
  const memberEmail1: string = typia.random<string & tags.Format<"email">>();
  const member1: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail1,
        username: RandomGenerator.alphaNumeric(8),
        password: "TestPassword123!",
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member1);

  // 2. Attempt self-follow with same memberId and followingId
  await TestValidator.error("self-follow should be rejected", async () => {
    await api.functional.communityPlatform.member.members.following.create(
      connection,
      {
        memberId: member1.id,
        followingId: member1.id,
      },
    );
  });

  // 3. Create second member account for additional validation
  const memberEmail2: string = typia.random<string & tags.Format<"email">>();
  const member2: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail2,
        username: RandomGenerator.alphaNumeric(8),
        password: "TestPassword123!",
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member2);

  // 4. Verify second member also cannot follow themselves
  await TestValidator.error(
    "second member self-follow should be rejected",
    async () => {
      await api.functional.communityPlatform.member.members.following.create(
        connection,
        {
          memberId: member2.id,
          followingId: member2.id,
        },
      );
    },
  );

  // 5. Verify that member1 can follow member2 (valid follow relationship)
  const validFollow: ICommunityPlatformMemberFollower =
    await api.functional.communityPlatform.member.members.following.create(
      connection,
      {
        memberId: member1.id,
        followingId: member2.id,
      },
    );
  typia.assert(validFollow);
  TestValidator.equals(
    "follower should be member1",
    validFollow.follower.id,
    member1.id,
  );
  TestValidator.equals(
    "following should be member2",
    validFollow.following.id,
    member2.id,
  );
}
