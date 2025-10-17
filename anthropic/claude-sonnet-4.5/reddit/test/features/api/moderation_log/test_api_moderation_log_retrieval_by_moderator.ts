import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityModerator";
import type { IRedditLikeContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeContentReport";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerationAction";
import type { IRedditLikeModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerationLog";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";

/**
 * Test retrieving a specific moderation log entry by its unique identifier.
 *
 * This test validates the complete moderation log retrieval workflow, ensuring
 * that moderators can access detailed audit trail information for moderation
 * events in their assigned communities. The test creates a realistic moderation
 * scenario by establishing a moderator, community, member, content, report, and
 * moderation action, then verifies that the generated log entry can be
 * successfully retrieved with complete details.
 *
 * Workflow:
 *
 * 1. Register moderator account for performing moderation actions
 * 2. Create community where moderation will occur
 * 3. Assign moderator to the community with permissions
 * 4. Register member account for content creation
 * 5. Create a post in the community
 * 6. Submit content report against the post
 * 7. Create moderation action (generates log entry)
 * 8. Retrieve and validate the moderation log entry
 */
export async function test_api_moderation_log_retrieval_by_moderator(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<20> &
          tags.Pattern<"^[a-zA-Z0-9_-]+$">
      >(),
      email: moderatorEmail,
      password: typia.random<string & tags.MinLength<8>>(),
    } satisfies IRedditLikeModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create community
  const community = await api.functional.redditLike.member.communities.create(
    connection,
    {
      body: {
        code: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<25> &
            tags.Pattern<"^[a-zA-Z0-9_]+$">
        >(),
        name: typia.random<string & tags.MinLength<3> & tags.MaxLength<25>>(),
        description: typia.random<
          string & tags.MinLength<10> & tags.MaxLength<500>
        >(),
        privacy_type: "public",
        posting_permission: "anyone_subscribed",
        allow_text_posts: true,
        allow_link_posts: true,
        allow_image_posts: true,
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert(community);

  // Step 3: Assign moderator to community
  const moderatorAssignment =
    await api.functional.redditLike.moderator.communities.moderators.create(
      connection,
      {
        communityId: community.id,
        body: {
          moderator_id: moderator.id,
          permissions: "manage_posts,manage_comments,access_reports",
        } satisfies IRedditLikeCommunityModerator.ICreate,
      },
    );
  typia.assert(moderatorAssignment);

  // Step 4: Create member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<20> &
          tags.Pattern<"^[a-zA-Z0-9_-]+$">
      >(),
      email: memberEmail,
      password: typia.random<string & tags.MinLength<8>>(),
    } satisfies IRedditLikeMember.ICreate,
  });
  typia.assert(member);

  // Step 5: Create post in community
  const post = await api.functional.redditLike.member.posts.create(connection, {
    body: {
      community_id: community.id,
      type: "text",
      title: typia.random<string & tags.MinLength<3> & tags.MaxLength<300>>(),
      body: typia.random<string & tags.MaxLength<40000>>(),
    } satisfies IRedditLikePost.ICreate,
  });
  typia.assert(post);

  // Step 6: Submit content report
  const contentReport = await api.functional.redditLike.content_reports.create(
    connection,
    {
      body: {
        reported_post_id: post.id,
        community_id: community.id,
        content_type: "post",
        violation_categories: "spam,harassment",
        additional_context: typia.random<string & tags.MaxLength<500>>(),
      } satisfies IRedditLikeContentReport.ICreate,
    },
  );
  typia.assert(contentReport);

  // Step 7: Create moderation action (this generates the log entry)
  const moderationAction =
    await api.functional.redditLike.moderation.actions.create(connection, {
      body: {
        report_id: contentReport.id,
        affected_post_id: post.id,
        community_id: community.id,
        action_type: "remove",
        content_type: "post",
        removal_type: "community_level",
        reason_category: "spam",
        reason_text: "This post violates community spam policies",
        internal_notes: "First offense for this user",
      } satisfies IRedditLikeModerationAction.ICreate,
    });
  typia.assert(moderationAction);

  // Step 8: Retrieve the moderation log entry
  const moderationLog =
    await api.functional.redditLike.moderator.moderation.logs.at(connection, {
      logId: moderationAction.id,
    });
  typia.assert(moderationLog);
}
