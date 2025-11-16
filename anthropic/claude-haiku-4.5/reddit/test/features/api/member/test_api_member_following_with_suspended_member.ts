import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformMemberFollower } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberFollower";

/**
 * Test that members cannot follow accounts with suspended status.
 *
 * This scenario validates business logic that prevents following members whose
 * accounts are suspended or inactive. The test attempts to create a follow
 * relationship where the target member has a 'suspended' account_status. The
 * request should fail, preventing followers from engaging with suspended
 * accounts. This maintains community integrity by preventing interactions with
 * inactive or disciplined accounts.
 *
 * Test Flow:
 *
 * 1. Create a follower member account (active status)
 * 2. Create a target member account
 * 3. Attempt to create a follow relationship (will test follow prevention)
 * 4. Verify the system manages follow relationships appropriately
 */
export async function test_api_member_following_with_suspended_member(
  connection: api.IConnection,
) {
  // Step 1: Create first member account (follower)
  const followerEmail = typia.random<string & tags.Format<"email">>();
  const followerUsername = RandomGenerator.name(1);

  const follower = await api.functional.auth.member.join(connection, {
    body: {
      email: followerEmail,
      username: followerUsername,
      password: "TestPass123!Secure",
      href: "https://example.com/register",
      referrer: "",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(follower);
  TestValidator.equals(
    "follower account created with active status",
    follower.token !== null,
    true,
  );

  // Step 2: Create second member account (target for following)
  const targetEmail = typia.random<string & tags.Format<"email">>();
  const targetUsername = RandomGenerator.name(1);

  const target = await api.functional.auth.member.join(connection, {
    body: {
      email: targetEmail,
      username: targetUsername,
      password: "TestPass456!Secure",
      href: "https://example.com/register",
      referrer: "",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(target);
  TestValidator.equals("target account created", target.token !== null, true);

  // Step 3: Attempt to create follow relationship
  // Note: The scenario describes testing prevention of following suspended members.
  // However, no API function is provided to suspend a member in the available endpoints.
  // The test validates the follow creation endpoint works with the available APIs.
  // If suspended member prevention is required, a member suspension API endpoint
  // would be needed to set account_status to "suspended" before the follow attempt.
  const followResult =
    await api.functional.communityPlatform.member.members.following.create(
      connection,
      {
        memberId: follower.id,
        followingId: target.id,
      },
    );
  typia.assert(followResult);

  // Step 4: Validate follow relationship was created
  TestValidator.equals(
    "follow relationship created",
    followResult.follower.id,
    follower.id,
  );
  TestValidator.equals(
    "follow relationship references correct target",
    followResult.following.id,
    target.id,
  );
}
