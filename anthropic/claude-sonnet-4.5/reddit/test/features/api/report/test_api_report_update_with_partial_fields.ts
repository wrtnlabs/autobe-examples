import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunity";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReport";

/**
 * Test partial updates to report fields.
 *
 * Validates that moderators can update individual report fields without
 * affecting other fields. This test creates a complete report workflow and then
 * performs a partial update by changing only the status field from "pending" to
 * "under_review" while leaving moderator_notes and resolution fields
 * unchanged.
 *
 * This ensures the optional nature of update fields works correctly and
 * supports incremental moderation workflows where moderators update reports in
 * stages.
 *
 * Test Steps:
 *
 * 1. Create and authenticate moderator account
 * 2. Create a community (moderator becomes owner/moderator)
 * 3. Create and authenticate member account
 * 4. Member creates a reportable post
 * 5. Member reports the post
 * 6. Moderator updates only the status field (pending → under_review)
 * 7. Validate status changed while other fields remained unchanged
 */
export async function test_api_report_update_with_partial_fields(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = RandomGenerator.alphaNumeric(12);

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      nickname: RandomGenerator.name(),
      ip: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityCommunityModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create community with valid name pattern
  const communityName = RandomGenerator.alphaNumeric(10);
  const community =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: communityName,
          display_title: RandomGenerator.name(3),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          rules: RandomGenerator.paragraph({ sentences: 3 }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
          banner_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: Create member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(12);

  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      email: memberEmail,
      password: memberPassword,
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
      show_online_status: false,
      show_subscribed_communities: false,
      show_activity_feed: true,
      ip: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityGuest.ICreate,
  });
  typia.assert(member);

  // Step 4: Member creates a post
  const post = await api.functional.redditCommunity.member.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        title: RandomGenerator.paragraph({ sentences: 1 }),
        post_type: "text",
        body: RandomGenerator.content({ paragraphs: 3 }),
        url: null,
        image_url: null,
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);

  // Step 5: Member reports the post
  const reportCategory = RandomGenerator.pick([
    "spam",
    "harassment",
    "hate_speech",
    "misinformation",
  ] as const);

  const report = await api.functional.redditCommunity.member.reports.create(
    connection,
    {
      body: {
        content_type: "post",
        target_content_id: post.id,
        reddit_community_community_id: community.id,
        category: reportCategory,
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IRedditCommunityReport.ICreate,
    },
  );
  typia.assert(report);

  // Verify initial status is pending
  TestValidator.equals("initial status is pending", report.status, "pending");

  // Capture initial timestamps for comparison
  const initialCreatedAt = report.created_at;
  const initialUpdatedAt = report.updated_at;

  // Step 6: Switch to moderator and perform partial update
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      ip: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityCommunityModerator.ILogin,
  });

  // Perform partial update - only update status field
  const updatedReport =
    await api.functional.redditCommunity.moderator.reports.update(connection, {
      reportId: report.id,
      body: {
        status: "under_review",
      } satisfies IRedditCommunityReport.IUpdate,
    });
  typia.assert(updatedReport);

  // Step 7: Validate partial update results
  TestValidator.equals(
    "status changed to under_review",
    updatedReport.status,
    "under_review",
  );

  TestValidator.equals("report ID unchanged", updatedReport.id, report.id);

  TestValidator.equals(
    "category unchanged",
    updatedReport.category,
    report.category,
  );

  TestValidator.equals(
    "description unchanged",
    updatedReport.description,
    report.description,
  );

  TestValidator.equals(
    "moderator_notes unchanged (remains null or original value)",
    updatedReport.moderator_notes,
    report.moderator_notes,
  );

  TestValidator.equals(
    "resolution unchanged (remains null or original value)",
    updatedReport.resolution,
    report.resolution,
  );

  TestValidator.equals(
    "created_at timestamp unchanged",
    updatedReport.created_at,
    initialCreatedAt,
  );

  TestValidator.predicate(
    "updated_at timestamp should change after update",
    updatedReport.updated_at !== initialUpdatedAt,
  );
}
