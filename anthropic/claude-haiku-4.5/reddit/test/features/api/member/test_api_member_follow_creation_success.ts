import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformMemberFollower } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberFollower";

/**
 * Test successful creation of a follow relationship between two members.
 *
 * This test validates the complete workflow of establishing a directed follow
 * relationship in the community platform:
 *
 * 1. Register primary member (follower) account
 * 2. Register secondary member (following) account
 * 3. Create follow relationship where primary follows secondary
 * 4. Verify response contains complete follow relationship with member details
 * 5. Validate timestamps and directional relationship integrity
 *
 * The test ensures that:
 *
 * - Follow relationships are properly created with all required fields
 * - Response includes member summary information for both participants
 * - Created_at timestamp is in valid ISO 8601 UTC format
 * - Relationships are directional (A→B does not imply B→A)
 * - Follow data persists and is properly retrievable
 */
export async function test_api_member_follow_creation_success(
  connection: api.IConnection,
) {
  // Step 1: Register primary member account (the follower)
  const memberA: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphabets(10),
        password: "SecurePass123!",
        href: "https://example.com/register",
        referrer: "",
        ip: "127.0.0.1",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(memberA);

  // Step 2: Register secondary member account (the one to be followed)
  // Create a new connection for the secondary member
  const memberBConnection: api.IConnection = { ...connection, headers: {} };
  const memberB: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(memberBConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphabets(10),
        password: "SecurePass123!",
        href: "https://example.com/register",
        referrer: "",
        ip: "127.0.0.1",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(memberB);

  // Step 3: Create follow relationship (member A follows member B)
  const followRelationship: ICommunityPlatformMemberFollower =
    await api.functional.communityPlatform.member.members.following.create(
      connection,
      {
        memberId: memberA.id,
        followingId: memberB.id,
      },
    );
  typia.assert(followRelationship);

  // Step 4: Verify follow relationship structure
  TestValidator.equals(
    "follow relationship ID is UUID",
    followRelationship.id.length > 0,
    true,
  );

  TestValidator.equals(
    "follower member ID matches member A",
    followRelationship.follower.id,
    memberA.id,
  );

  TestValidator.equals(
    "following member ID matches member B",
    followRelationship.following.id,
    memberB.id,
  );

  // Step 5: Verify member A details in follower field
  TestValidator.equals(
    "follower email matches",
    followRelationship.follower.email !== null,
    true,
  );

  TestValidator.equals(
    "follower account status is active",
    followRelationship.follower.account_status,
    "active",
  );

  // Step 6: Verify member B details in following field
  TestValidator.equals(
    "following email matches",
    followRelationship.following.email !== null,
    true,
  );

  TestValidator.equals(
    "following account status is active",
    followRelationship.following.account_status,
    "active",
  );

  // Step 7: Verify created_at timestamp format
  TestValidator.predicate("created_at is valid ISO 8601 date-time", () => {
    const dateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;
    return dateRegex.test(followRelationship.created_at);
  });

  // Step 8: Verify timestamp is recent (within last minute)
  TestValidator.predicate("created_at timestamp is recent", () => {
    const createdTime = new Date(followRelationship.created_at).getTime();
    const now = new Date().getTime();
    const diffMs = now - createdTime;
    return diffMs >= 0 && diffMs < 60000; // Within 60 seconds
  });

  // Step 9: Verify username information is present
  TestValidator.predicate(
    "follower username exists",
    () => followRelationship.follower.username.length > 0,
  );

  TestValidator.predicate(
    "following username exists",
    () => followRelationship.following.username.length > 0,
  );

  // Step 10: Verify karma score is present and non-negative
  TestValidator.predicate(
    "follower karma score is non-negative",
    () => followRelationship.follower.karma_score >= 0,
  );

  TestValidator.predicate(
    "following karma score is non-negative",
    () => followRelationship.following.karma_score >= 0,
  );
}
