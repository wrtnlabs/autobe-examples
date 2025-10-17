import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAction";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportCategory";

/**
 * Test updating a moderation action by moderator for comment
 * clarification/appeal decision.
 *
 * Validates that only the assigned moderator may update the moderation action
 * record, that description field can be updated to append appeal result or
 * clarification, and triggers audit fields (timestamps/actor). Covers edge
 * cases for unauthorized access and invalid updates.
 */
export async function test_api_moderation_action_update_by_moderator_appeal_comment_clarification(
  connection: api.IConnection,
) {
  // -- Member registration (for basic content creation)
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(10);
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    },
  });
  typia.assert(member);

  // -- Community creation by member
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10),
          title: RandomGenerator.paragraph({ sentences: 3 }),
          description: RandomGenerator.content({ paragraphs: 2 }),
          slug: RandomGenerator.alphaNumeric(10),
        },
      },
    );
  typia.assert(community);

  // -- Moderator registration for the new community
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = RandomGenerator.alphaNumeric(12);
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      community_id: community.id,
    },
  });
  typia.assert(moderator);

  // -- Member creates a post in the community
  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        community_platform_community_id: community.id,
        title: RandomGenerator.paragraph({ sentences: 5 }),
        content_body: RandomGenerator.content({ paragraphs: 1 }),
        content_type: "text",
      },
    },
  );
  typia.assert(post);

  // -- Member adds a comment to their post
  const comment =
    await api.functional.communityPlatform.member.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: {
          community_platform_post_id: post.id,
          body: RandomGenerator.paragraph({ sentences: 4 }),
        },
      },
    );
  typia.assert(comment);

  // -- Admin creates a report category (simulate admin connection)
  // For this test, we use 'moderator' connection, as admin join is not available in this scenario. In real business, should differentiate privileges.
  const reportCategory =
    await api.functional.communityPlatform.admin.reportCategories.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          allow_free_text: true,
        },
      },
    );
  typia.assert(reportCategory);

  // -- Member reports their own comment
  const report = await api.functional.communityPlatform.member.reports.create(
    connection,
    {
      body: {
        comment_id: comment.id,
        report_category_id: reportCategory.id,
        reason_text: "This is a test report for moderation logic test.",
      },
    },
  );
  typia.assert(report);

  // -- Moderator creates moderation action to remove the comment (simulate login as moderator)
  const moderationAction =
    await api.functional.communityPlatform.moderator.moderationActions.create(
      connection,
      {
        body: {
          actor_id: moderator.id,
          target_comment_id: comment.id,
          report_id: report.id,
          action_type: "remove_comment",
          description: "Comment removed for test case.",
        },
      },
    );
  typia.assert(moderationAction);

  // Save old updated_at for comparison
  const oldUpdatedAt = moderationAction.created_at;

  // -- Moderator updates the moderation action (add clarification/appeal outcome)
  const clarificationText =
    "Review completed: Comment removal justified. No restoration.";
  const updatedModerationAction =
    await api.functional.communityPlatform.moderator.moderationActions.update(
      connection,
      {
        moderationActionId: moderationAction.id,
        body: {
          actor_id: moderator.id,
          description: clarificationText,
        },
      },
    );
  typia.assert(updatedModerationAction);

  // Confirm audit fields and description
  TestValidator.equals(
    "moderation action id matches",
    updatedModerationAction.id,
    moderationAction.id,
  );
  TestValidator.equals(
    "actor id updated",
    updatedModerationAction.actor_id,
    moderator.id,
  );
  TestValidator.equals(
    "clarification text updated",
    updatedModerationAction.description,
    clarificationText,
  );
  TestValidator.predicate(
    "updated_at is changed",
    updatedModerationAction.created_at !== oldUpdatedAt,
  );

  // -- Edge case: Unauthorized update attempt (simulate by using member's actor_id)
  await TestValidator.error(
    "non-moderator cannot update moderation action",
    async () => {
      await api.functional.communityPlatform.moderator.moderationActions.update(
        connection,
        {
          moderationActionId: moderationAction.id,
          body: {
            actor_id: member.id,
            description: "Malicious update attempt.",
          },
        },
      );
    },
  );

  // -- Edge case: Invalid update fields (empty body)
  await TestValidator.error(
    "update fails when no valid fields provided",
    async () => {
      await api.functional.communityPlatform.moderator.moderationActions.update(
        connection,
        {
          moderationActionId: moderationAction.id,
          body: {},
        },
      );
    },
  );
}
