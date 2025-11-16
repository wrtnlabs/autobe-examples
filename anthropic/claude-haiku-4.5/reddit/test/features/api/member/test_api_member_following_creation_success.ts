import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformMemberFollower } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberFollower";

/**
 * Test successful creation of a follow relationship between two members.
 *
 * This test validates the core following feature where an authenticated member
 * initiates following another member. The workflow includes:
 *
 * 1. Create a follower member account
 * 2. Create a following member account (the member to be followed)
 * 3. Authenticate as the follower member
 * 4. Create a follow relationship from follower to following member
 * 5. Verify the response contains correct follow relationship data with both
 *    member summaries
 *
 * This ensures the social graph functionality correctly establishes member
 * connections.
 */
export async function test_api_member_following_creation_success(
  connection: api.IConnection,
) {
  // Step 1: Create follower member account
  const followerBody = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.alphabets(8),
    password: "SecurePassword123!",
    ip: "192.168.1.1",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMember.ICreate;

  const follower = await api.functional.auth.member.join(connection, {
    body: followerBody,
  });
  typia.assert(follower);

  // Step 2: Create following member account (member to be followed)
  const followingBody = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.alphabets(8),
    password: "SecurePassword456!",
    ip: "192.168.1.2",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMember.ICreate;

  const following = await api.functional.auth.member.join(connection, {
    body: followingBody,
  });
  typia.assert(following);

  // Step 3: Create follow relationship
  const followRelationship =
    await api.functional.communityPlatform.member.members.following.create(
      connection,
      {
        memberId: follower.id,
        followingId: following.id,
      },
    );
  typia.assert(followRelationship);

  // Step 4: Verify follow relationship data
  TestValidator.equals(
    "follower member ID in relationship matches created follower",
    followRelationship.follower.id,
    follower.id,
  );

  TestValidator.equals(
    "following member ID in relationship matches created following member",
    followRelationship.following.id,
    following.id,
  );

  TestValidator.equals(
    "follower email matches created follower email",
    followRelationship.follower.email,
    followerBody.email,
  );

  TestValidator.equals(
    "following member email matches created following member email",
    followRelationship.following.email,
    followingBody.email,
  );

  TestValidator.predicate(
    "follower has active account status",
    followRelationship.follower.account_status === "active",
  );

  TestValidator.predicate(
    "following member has active account status",
    followRelationship.following.account_status === "active",
  );

  TestValidator.predicate(
    "follow relationship has valid ID",
    followRelationship.id !== undefined && followRelationship.id.length > 0,
  );
}
