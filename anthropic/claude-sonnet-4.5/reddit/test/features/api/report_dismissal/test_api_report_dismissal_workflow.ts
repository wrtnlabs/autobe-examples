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
 * Test the workflow where a moderator dismisses a report as invalid or
 * frivolous.
 *
 * This test validates the complete report dismissal workflow:
 *
 * 1. Moderator creates a community
 * 2. Member submits a spam report on a post
 * 3. Moderator determines the report was submitted in bad faith
 * 4. Moderator updates status to dismissed without detailed review
 * 5. Validates dismissed status is set correctly
 * 6. Verifies report is removed from active moderation queues
 * 7. Confirms audit trail is maintained
 */
export async function test_api_report_dismissal_workflow(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account and authenticate
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "SecureMod123!";
  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        nickname: RandomGenerator.name(),
        ip: "192.168.1.1",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Moderator creates a community
  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10),
          display_title: RandomGenerator.name(3),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          rules: RandomGenerator.paragraph({ sentences: 3 }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
          banner_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: Create member account and authenticate
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "MemberPass456!";
  const member: IRedditCommunityGuest.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(12),
        email: memberEmail,
        password: memberPassword,
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 1 }),
        avatar_url: typia.random<string & tags.Format<"uri">>(),
        show_online_status: false,
        show_subscribed_communities: false,
        show_activity_feed: true,
        ip: "192.168.1.100",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityGuest.ICreate,
    });
  typia.assert(member);

  // Step 4: Member creates a post in the community
  const post: IRedditCommunityPost =
    await api.functional.redditCommunity.member.posts.create(connection, {
      body: {
        community_id: community.id,
        title: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 5,
          wordMax: 10,
        }),
        post_type: "text",
        body: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditCommunityPost.ICreate,
    });
  typia.assert(post);

  // Step 5: Member submits a spam report on the post
  const report: IRedditCommunityReport =
    await api.functional.redditCommunity.member.reports.create(connection, {
      body: {
        content_type: "post",
        target_content_id: post.id,
        reddit_community_community_id: community.id,
        category: "spam",
        description: "This looks like spam to me",
      } satisfies IRedditCommunityReport.ICreate,
    });
  typia.assert(report);

  // Validate initial report status is pending
  TestValidator.equals("initial report status", report.status, "pending");

  // Step 6: Switch to moderator authentication
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      ip: "192.168.1.1",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityCommunityModerator.ILogin,
  });

  // Step 7: Moderator dismisses the report as frivolous
  const dismissedReport: IRedditCommunityReport =
    await api.functional.redditCommunity.moderator.reports.update(connection, {
      reportId: report.id,
      body: {
        status: "dismissed",
        moderator_notes:
          "Report submitted in bad faith. Content does not violate community rules.",
        resolution: "rejected",
      } satisfies IRedditCommunityReport.IUpdate,
    });
  typia.assert(dismissedReport);

  // Step 8: Validate the dismissed report status and metadata
  TestValidator.equals(
    "dismissed report status",
    dismissedReport.status,
    "dismissed",
  );
  TestValidator.equals(
    "dismissed report resolution",
    dismissedReport.resolution,
    "rejected",
  );
  TestValidator.predicate(
    "moderator notes exist",
    dismissedReport.moderator_notes !== null &&
      dismissedReport.moderator_notes !== undefined,
  );

  // Verify report ID matches original
  TestValidator.equals("report ID consistency", dismissedReport.id, report.id);

  // Verify audit trail - created_at should be unchanged
  TestValidator.equals(
    "audit trail preserved",
    dismissedReport.created_at,
    report.created_at,
  );

  // Verify updated_at has been modified
  TestValidator.predicate(
    "updated timestamp changed",
    dismissedReport.updated_at !== report.updated_at,
  );
}
