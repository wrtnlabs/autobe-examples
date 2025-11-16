import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformMemberFollower } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberFollower";

/**
 * Test successful creation of a follow relationship between two members.
 *
 * This test validates that an authenticated member can successfully follow
 * another member, creating a proper follow relationship in the system.
 *
 * Test workflow:
 *
 * 1. Create and authenticate the follower member
 * 2. Create and authenticate the following (target) member
 * 3. Switch back to follower's authentication context
 * 4. Create follow relationship from follower to following member
 * 5. Validate the follow relationship is properly created with correct details
 */
export async function test_api_member_following_create_success(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate the follower member
  const followerData = typia.random<ICommunityPlatformMember.ICreate>();
  const follower: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: followerData,
    });
  typia.assert(follower);

  // Step 2: Create and authenticate the following member
  const followingData = typia.random<ICommunityPlatformMember.ICreate>();
  const following: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: followingData,
    });
  typia.assert(following);

  // Step 3: Switch back to follower's authentication context
  const followerConnection: api.IConnection = {
    ...connection,
    headers: {
      ...connection.headers,
      Authorization: follower.token.access,
    },
  };

  // Step 4: Create follow relationship
  const followRelationship: ICommunityPlatformMemberFollower =
    await api.functional.communityPlatform.member.members.following.create(
      followerConnection,
      {
        memberId: follower.id,
        followingId: following.id,
      },
    );
  typia.assert(followRelationship);

  // Step 5: Validate the follow relationship details
  TestValidator.equals(
    "follower member ID in relationship matches created follower",
    followRelationship.follower.id,
    follower.id,
  );

  TestValidator.equals(
    "following member ID in relationship matches created following",
    followRelationship.following.id,
    following.id,
  );

  TestValidator.equals(
    "follower email in relationship matches original email",
    followRelationship.follower.email,
    followerData.email,
  );

  TestValidator.equals(
    "following email in relationship matches original email",
    followRelationship.following.email,
    followingData.email,
  );

  TestValidator.predicate(
    "created_at timestamp is valid ISO 8601 datetime",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(followRelationship.created_at),
  );

  TestValidator.predicate(
    "follow relationship ID is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      followRelationship.id,
    ),
  );

  TestValidator.predicate(
    "follower account status is active",
    followRelationship.follower.account_status === "active",
  );

  TestValidator.predicate(
    "following account status is active",
    followRelationship.following.account_status === "active",
  );

  TestValidator.predicate(
    "follower karma score is non-negative",
    followRelationship.follower.karma_score >= 0,
  );

  TestValidator.predicate(
    "following karma score is non-negative",
    followRelationship.following.karma_score >= 0,
  );
}
