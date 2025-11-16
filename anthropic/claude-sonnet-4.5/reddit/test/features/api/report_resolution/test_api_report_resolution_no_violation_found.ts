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
 * Test moderator reviewing a report and determining no policy violation
 * occurred.
 *
 * This test validates the complete workflow where a community member reports
 * content for misinformation, but after moderator review, the content is found
 * to comply with community standards. The moderator updates the report status
 * to resolved_no_violation, sets resolution to rejected, and documents the
 * decision rationale in moderator notes.
 *
 * Workflow:
 *
 * 1. Create moderator account for report review
 * 2. Moderator creates a community
 * 3. Create member account for content creation
 * 4. Member creates a post
 * 5. Member reports the post for misinformation
 * 6. Switch to moderator authentication
 * 7. Moderator reviews and resolves report with no violation found
 * 8. Validate report status, resolution, and moderator notes are properly recorded
 */
export async function test_api_report_resolution_no_violation_found(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "moderator123";

  const moderator = await api.functional.auth.moderator.join(connection, {
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
  const community =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10).toLowerCase(),
          display_title: RandomGenerator.paragraph({ sentences: 2 }),
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
  const memberPassword = "member123";

  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(8).toLowerCase(),
      email: memberEmail,
      password: memberPassword,
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
      show_online_status: false,
      show_subscribed_communities: false,
      show_activity_feed: true,
      ip: "192.168.1.2",
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

  // Step 5: Member reports the post for misinformation
  const report = await api.functional.redditCommunity.member.reports.create(
    connection,
    {
      body: {
        content_type: "post",
        target_content_id: post.id,
        reddit_community_community_id: community.id,
        category: "misinformation",
        description:
          "This post contains misleading information about the topic",
      } satisfies IRedditCommunityReport.ICreate,
    },
  );
  typia.assert(report);

  // Validate initial report state
  TestValidator.equals("initial report status", report.status, "pending");
  TestValidator.equals("initial resolution is null", report.resolution, null);

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

  // Step 7: Moderator resolves report with no violation found
  const moderatorNotes =
    "After thorough review, this post does not violate community standards. The content presents factual information with proper context and does not constitute misinformation.";

  const resolvedReport =
    await api.functional.redditCommunity.moderator.reports.update(connection, {
      reportId: report.id,
      body: {
        status: "resolved_no_violation",
        resolution: "rejected",
        moderator_notes: moderatorNotes,
      } satisfies IRedditCommunityReport.IUpdate,
    });
  typia.assert(resolvedReport);

  // Step 8: Validate resolution results
  TestValidator.equals(
    "report status updated to resolved_no_violation",
    resolvedReport.status,
    "resolved_no_violation",
  );
  TestValidator.equals(
    "resolution set to rejected",
    resolvedReport.resolution,
    "rejected",
  );
  TestValidator.equals(
    "moderator notes recorded",
    resolvedReport.moderator_notes,
    moderatorNotes,
  );
  TestValidator.equals("report ID unchanged", resolvedReport.id, report.id);
  TestValidator.equals(
    "content type unchanged",
    resolvedReport.content_type,
    "post",
  );
}
