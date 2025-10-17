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
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";

export async function test_api_admin_moderation_action_platform_wide_removal(
  connection: api.IConnection,
) {
  // Step 1: Create member account for content creation
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = typia.random<string & tags.MinLength<8>>();
  const memberUsername = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<20> &
      tags.Pattern<"^[a-zA-Z0-9_-]+$">
  >();

  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: memberUsername,
      email: memberEmail,
      password: memberPassword,
    } satisfies IRedditLikeMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create administrator account with platform-wide authority
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.MinLength<8>>();
  const adminUsername = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<20> &
      tags.Pattern<"^[a-zA-Z0-9_-]+$">
  >();

  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      username: adminUsername,
      email: adminEmail,
      password: adminPassword,
    } satisfies IRedditLikeAdmin.ICreate,
  });
  typia.assert(admin);

  // Re-authenticate as member to create community and post
  connection.headers = {};
  connection.headers.Authorization = member.token.access;

  // Step 3: Member creates a community
  const communityCode = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<25> &
      tags.Pattern<"^[a-zA-Z0-9_]+$">
  >();
  const communityName = typia.random<
    string & tags.MinLength<3> & tags.MaxLength<25>
  >();
  const communityDescription = typia.random<
    string & tags.MinLength<10> & tags.MaxLength<500>
  >();

  const community = await api.functional.redditLike.member.communities.create(
    connection,
    {
      body: {
        code: communityCode,
        name: communityName,
        description: communityDescription,
        privacy_type: "public",
        posting_permission: "anyone_subscribed",
        allow_text_posts: true,
        allow_link_posts: true,
        allow_image_posts: true,
        primary_category: "technology",
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert(community);

  // Step 4: Member creates a post in the community
  const postTitle = typia.random<
    string & tags.MinLength<3> & tags.MaxLength<300>
  >();
  const postBody = typia.random<string & tags.MaxLength<40000>>();

  const post = await api.functional.redditLike.member.posts.create(connection, {
    body: {
      community_id: community.id,
      type: "text",
      title: postTitle,
      body: postBody,
    } satisfies IRedditLikePost.ICreate,
  });
  typia.assert(post);

  // Step 5: Submit content report for the post
  const violationCategories = "spam,misinformation";
  const additionalContext = typia.random<string & tags.MaxLength<500>>();

  const report = await api.functional.redditLike.content_reports.create(
    connection,
    {
      body: {
        reported_post_id: post.id,
        community_id: community.id,
        content_type: "post",
        violation_categories: violationCategories,
        additional_context: additionalContext,
      } satisfies IRedditLikeContentReport.ICreate,
    },
  );
  typia.assert(report);

  // Switch to admin authentication for moderation action
  connection.headers = {};
  connection.headers.Authorization = admin.token.access;

  // Step 6: Administrator creates platform-level moderation action
  const reasonCategory = "policy_violation";
  const reasonText =
    "This content violates platform-wide policies regarding spam and misinformation. The post contains misleading information and promotional content that does not meet our community standards.";
  const internalNotes =
    "Flagged by automated system and confirmed by manual review. User has previous warnings for similar violations.";

  const moderationAction =
    await api.functional.redditLike.admin.moderation.actions.create(
      connection,
      {
        body: {
          report_id: report.id,
          affected_post_id: post.id,
          community_id: community.id,
          action_type: "remove",
          content_type: "post",
          removal_type: "platform_wide",
          reason_category: reasonCategory,
          reason_text: reasonText,
          internal_notes: internalNotes,
        } satisfies IRedditLikeModerationAction.ICreate,
      },
    );
  typia.assert(moderationAction);

  // Validate the moderation action properties
  TestValidator.equals(
    "action type is remove",
    moderationAction.action_type,
    "remove",
  );
  TestValidator.equals(
    "content type is post",
    moderationAction.content_type,
    "post",
  );
  TestValidator.equals(
    "removal type is platform-wide",
    moderationAction.removal_type,
    "platform_wide",
  );
  TestValidator.equals(
    "reason category matches",
    moderationAction.reason_category,
    reasonCategory,
  );
  TestValidator.equals(
    "reason text matches",
    moderationAction.reason_text,
    reasonText,
  );
  TestValidator.equals(
    "status is completed",
    moderationAction.status,
    "completed",
  );
  TestValidator.predicate(
    "created timestamp exists",
    moderationAction.created_at !== null &&
      moderationAction.created_at !== undefined,
  );
}
