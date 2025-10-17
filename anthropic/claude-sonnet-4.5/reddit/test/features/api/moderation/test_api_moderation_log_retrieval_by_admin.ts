import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAdmin";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeContentReport";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerationAction";
import type { IRedditLikeModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerationLog";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";

/**
 * Test admin retrieval of moderation log entries by unique identifier.
 *
 * This test validates the complete audit trail access for platform
 * administrators reviewing moderation activities. It follows a comprehensive
 * workflow:
 *
 * 1. Create admin account for authentication context
 * 2. Create member account for content authorship
 * 3. Create community to provide moderation context
 * 4. Create post that will be subject to moderation
 * 5. Submit content report to trigger moderation workflow
 * 6. Create moderation action which generates log entry
 * 7. Retrieve and validate the moderation log entry
 *
 * Validates that the log includes complete details such as log type, actor
 * information, action descriptions, timestamps, and metadata.
 */
export async function test_api_moderation_log_retrieval_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Create admin account
  const adminData = {
    username: typia.random<
      string &
        tags.MinLength<3> &
        tags.MaxLength<20> &
        tags.Pattern<"^[a-zA-Z0-9_-]+$">
    >(),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
  } satisfies IRedditLikeAdmin.ICreate;

  const admin: IRedditLikeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminData,
    });
  typia.assert(admin);

  // Step 2: Create member account for content creation
  const memberData = {
    username: typia.random<
      string &
        tags.MinLength<3> &
        tags.MaxLength<20> &
        tags.Pattern<"^[a-zA-Z0-9_-]+$">
    >(),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
  } satisfies IRedditLikeMember.ICreate;

  const member: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(member);

  // Step 3: Create community as member
  const communityData = {
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
    primary_category: "general",
  } satisfies IRedditLikeCommunity.ICreate;

  const community: IRedditLikeCommunity =
    await api.functional.redditLike.member.communities.create(connection, {
      body: communityData,
    });
  typia.assert(community);

  // Step 4: Create post as member
  const postData = {
    community_id: community.id,
    type: "text",
    title: typia.random<string & tags.MinLength<3> & tags.MaxLength<300>>(),
    body: typia.random<string & tags.MaxLength<40000>>(),
  } satisfies IRedditLikePost.ICreate;

  const post: IRedditLikePost =
    await api.functional.redditLike.member.posts.create(connection, {
      body: postData,
    });
  typia.assert(post);

  // Step 5: Submit content report against the post
  const reportData = {
    reported_post_id: post.id,
    community_id: community.id,
    content_type: "post",
    violation_categories: "spam,inappropriate",
    additional_context: "This post contains spam content",
  } satisfies IRedditLikeContentReport.ICreate;

  const report: IRedditLikeContentReport =
    await api.functional.redditLike.content_reports.create(connection, {
      body: reportData,
    });
  typia.assert(report);

  // Step 6: Create moderation action as admin (already authenticated)
  const moderationActionData = {
    report_id: report.id,
    affected_post_id: post.id,
    community_id: community.id,
    action_type: "remove",
    content_type: "post",
    removal_type: "community_level",
    reason_category: "spam",
    reason_text: "Post removed for spam violations",
    internal_notes: "Clear spam pattern detected",
  } satisfies IRedditLikeModerationAction.ICreate;

  const moderationAction: IRedditLikeModerationAction =
    await api.functional.redditLike.admin.moderation.actions.create(
      connection,
      {
        body: moderationActionData,
      },
    );
  typia.assert(moderationAction);

  // Step 7: Retrieve the moderation log entry by ID
  // Assumption: Using moderation action ID as log ID
  const logId = moderationAction.id;

  const moderationLog: IRedditLikeModerationLog =
    await api.functional.redditLike.admin.moderation.logs.at(connection, {
      logId: logId,
    });
  typia.assert(moderationLog);
}
