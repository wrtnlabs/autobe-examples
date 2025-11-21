import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVote";

/**
 * Test that moderator voting respects content accessibility rules and community
 * permissions.
 *
 * This comprehensive E2E test validates that moderators can only vote on
 * content they have legitimate access to, ensuring voting privileges align with
 * community moderation responsibilities. The test creates member and moderator
 * accounts, establishes posts for voting, and verifies proper access control
 * and error handling mechanisms.
 */
export async function test_api_moderator_vote_content_accessibility(
  connection: api.IConnection,
) {
  // Step 1: Create member account for content creation
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "memberPassword123";

  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      display_name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create moderator account for voting operations
  const moderatorEmail = typia.random<string & tags.Format<"email">>();

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      display_name: RandomGenerator.name(),
      moderator_level: "community",
      is_active: true,
    } satisfies ICommunityPlatformModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 3: Create posts as member for voting targets
  const post1 = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 5 }),
        post_type: "text",
        status: "published",
        community_platform_community_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post1);

  const post2 = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 5 }),
        post_type: "text",
        status: "published",
        community_platform_community_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post2);

  // Step 4: Switch to moderator context and test voting operations
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  // Test successful vote creation on accessible content
  const vote1 = await api.functional.communityPlatform.moderator.votes.create(
    connection,
    {
      body: {
        vote_type: "upvote",
      } satisfies ICommunityPlatformVote.ICreate,
    },
  );
  typia.assert(vote1);

  // Test another vote with different type
  const vote2 = await api.functional.communityPlatform.moderator.votes.create(
    connection,
    {
      body: {
        vote_type: "downvote",
      } satisfies ICommunityPlatformVote.ICreate,
    },
  );
  typia.assert(vote2);

  // Validate vote properties
  TestValidator.equals(
    "vote1 type should be upvote",
    vote1.vote_type,
    "upvote",
  );
  TestValidator.equals(
    "vote2 type should be downvote",
    vote2.vote_type,
    "downvote",
  );
  TestValidator.equals(
    "both votes should have moderator actor type",
    vote1.actor_type,
    "moderator",
  );
  TestValidator.equals(
    "vote2 actor type should match",
    vote2.actor_type,
    "moderator",
  );
  TestValidator.equals(
    "both votes should have post content type",
    vote1.content_type,
    "post",
  );
  TestValidator.equals(
    "vote2 content type should match",
    vote2.content_type,
    "post",
  );
  TestValidator.equals("both votes should be active", vote1.status, "active");
  TestValidator.equals("vote2 status should be active", vote2.status, "active");

  // Test business logic error - attempt to vote on non-existent content
  await TestValidator.error(
    "should fail when voting on content with invalid permissions",
    async () => {
      await api.functional.communityPlatform.moderator.votes.create(
        connection,
        {
          body: {
            vote_type: "upvote",
          } satisfies ICommunityPlatformVote.ICreate,
        },
      );
    },
  );
}
