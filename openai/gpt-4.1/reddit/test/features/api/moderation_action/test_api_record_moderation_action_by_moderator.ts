import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAction";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportCategory";

/**
 * Test the complete moderator-driven flow for recording a moderation action in
 * response to a report.
 *
 * This scenario covers:
 *
 * 1. Creating a new community.
 * 2. Creating a post in the community as a member.
 * 3. Creating a report category as an admin (required for reporting).
 * 4. Filing a report against the created post as a member.
 * 5. Registering a new moderator account for the community (the acting moderator).
 * 6. Using the moderator's session, recording a moderation action that references
 *    the report and the post (e.g., 'remove_post') with a description.
 * 7. Asserting that all critical metadata is present: actor ID, action type,
 *    affected post, referenced report, description, and timestamp.
 * 8. Verifying that only an authenticated moderator can perform the action –
 *    attempt to create a moderation action as an unauthorized user, and confirm
 *    that access is denied.
 *
 * The test validates data and workflow integrity, authorization enforcement,
 * and that moderation actions are audit-traceable.
 */
export async function test_api_record_moderation_action_by_moderator(
  connection: api.IConnection,
) {
  // 1. Create a community as a member is required for the context.
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2).replace(/\s+/g, "-").toLowerCase(),
          title: RandomGenerator.paragraph({ sentences: 3 }),
          description: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 8,
            sentenceMax: 12,
          }),
          slug: RandomGenerator.name(2).replace(/\s+/g, "-").toLowerCase(),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 2. Create a post within the community
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_platform_community_id: community.id,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content_body: RandomGenerator.content({ paragraphs: 2 }),
        content_type: "text",
        status: "published",
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post);

  // 3. Create a report category (admin flow required for reporting)
  const reportCategory: ICommunityPlatformReportCategory =
    await api.functional.communityPlatform.admin.reportCategories.create(
      connection,
      {
        body: {
          name: "spam-" + RandomGenerator.alphaNumeric(8),
          allow_free_text: true,
        } satisfies ICommunityPlatformReportCategory.ICreate,
      },
    );
  typia.assert(reportCategory);

  // 4. File a report against the post
  const report: ICommunityPlatformReport =
    await api.functional.communityPlatform.member.reports.create(connection, {
      body: {
        post_id: post.id,
        report_category_id: reportCategory.id,
        reason_text: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies ICommunityPlatformReport.ICreate,
    });
  typia.assert(report);

  // 5. Create a moderator for the community
  const modEmail: string =
    RandomGenerator.name(1).replace(/\s+/g, "").toLowerCase() + "_mod@e2e.com";
  const modPassword: string = "Test!1234";
  const moderatorAuth: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: modEmail,
        password: modPassword,
        community_id: community.id,
      } satisfies ICommunityPlatformModerator.IJoin,
    });
  typia.assert(moderatorAuth);

  // 6. Record a moderation action as the new moderator (using authenticated session implied by SDK)
  const modActionDesc = RandomGenerator.paragraph({ sentences: 3 });
  const modActionInput = {
    actor_id: moderatorAuth.id,
    target_post_id: post.id,
    target_comment_id: null,
    report_id: report.id,
    action_type: "remove_post",
    description: modActionDesc,
  } satisfies ICommunityPlatformModerationAction.ICreate;

  const action: ICommunityPlatformModerationAction =
    await api.functional.communityPlatform.moderator.moderationActions.create(
      connection,
      {
        body: modActionInput,
      },
    );
  typia.assert(action);
  TestValidator.equals(
    "moderation action actor_id matches moderator",
    action.actor_id,
    moderatorAuth.id,
  );
  TestValidator.equals(
    "moderation action target_post_id matches",
    action.target_post_id,
    post.id,
  );
  TestValidator.equals(
    "moderation action report_id matches",
    action.report_id,
    report.id,
  );
  TestValidator.equals(
    "moderation action action_type matches",
    action.action_type,
    "remove_post",
  );
  TestValidator.equals(
    "moderation action description matches",
    action.description,
    modActionDesc,
  );
  TestValidator.predicate(
    "moderation action created_at is ISO date",
    typeof action.created_at === "string" && action.created_at.length > 0,
  );

  // 7. Negative test: unauthorized user cannot record moderation action
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthorized user cannot record moderation action",
    async () => {
      await api.functional.communityPlatform.moderator.moderationActions.create(
        unauthConn,
        {
          body: {
            actor_id: action.actor_id,
            target_post_id: post.id,
            target_comment_id: null,
            report_id: report.id,
            action_type: "remove_post",
            description: "Should not succeed",
          } satisfies ICommunityPlatformModerationAction.ICreate,
        },
      );
    },
  );
}
