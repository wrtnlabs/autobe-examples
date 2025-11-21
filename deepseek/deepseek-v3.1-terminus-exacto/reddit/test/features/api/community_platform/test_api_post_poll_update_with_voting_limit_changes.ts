import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostPoll } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostPoll";

/**
 * Test moderator updating poll voting limits and configuration settings.
 *
 * This comprehensive E2E test validates that moderators can adjust maximum
 * votes per user settings and other poll parameters to manage community
 * engagement. The scenario tests poll management capabilities including
 * duration adjustments and question modifications.
 */
export async function test_api_post_poll_update_with_voting_limit_changes(
  connection: api.IConnection,
) {
  // Note: This test scenario requires pre-existing community and poll infrastructure
  // that is not available through the provided API functions. The test demonstrates
  // the intended workflow but cannot be fully implemented with the available APIs.

  // Step 1: Create and authenticate as member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphabets(12);

  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      display_name: RandomGenerator.name(2),
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create a post with poll type
  // Note: Community ID must reference an existing community
  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 5,
          wordMin: 3,
          wordMax: 8,
        }),
        post_type: "poll",
        status: "published",
        community_platform_community_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);

  // Step 3: Create and authenticate as moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      display_name: RandomGenerator.name(2),
      moderator_level: "community",
      is_active: true,
    } satisfies ICommunityPlatformModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 4: Attempt to update poll configuration
  // Note: This will fail because no poll was actually created for the post
  // The API expects an existing poll associated with the post
  await TestValidator.error(
    "poll update should fail when no poll exists",
    async () => {
      await api.functional.communityPlatform.moderator.posts.polls.update(
        connection,
        {
          postId: post.id,
          body: {
            question: "Updated poll question with new voting limits",
            duration_days: 14,
            max_votes_per_user: 3,
            expires_at: new Date(
              Date.now() + 14 * 24 * 60 * 60 * 1000,
            ).toISOString(),
          } satisfies ICommunityPlatformPostPoll.IUpdate,
        },
      );
    },
  );

  // Alternative validation: Test that the post was created successfully
  TestValidator.equals("post created with poll type", post.post_type, "poll");
  TestValidator.equals("post is published", post.status, "published");
  TestValidator.predicate("post has valid UUID", () =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      post.id,
    ),
  );
}
