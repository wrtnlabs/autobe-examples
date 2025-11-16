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
 * Test retrieval of complete report details by report ID to enable informed
 * moderation decisions.
 *
 * This scenario validates that moderators can access full report information
 * including reported content context, reporter details, violation specifics,
 * and current review status.
 *
 * Workflow:
 *
 * 1. Authenticate as moderator
 * 2. Create community for content context
 * 3. Authenticate as member to create reportable content
 * 4. Create a post with specific content
 * 5. Submit a content violation report with category 'harassment' and detailed
 *    description
 * 6. Authenticate back as moderator
 * 7. Retrieve the report by its ID
 * 8. Validate response contains complete report entity
 * 9. Verify report.id matches the submitted report ID
 * 10. Verify report.category is 'harassment'
 * 11. Verify report.description contains the submitted text
 * 12. Verify report.content_type is 'post'
 * 13. Verify report.status is 'pending'
 * 14. Verify report.reporter contains member summary information
 * 15. Verify report.community contains community summary
 * 16. Verify report.target_post contains post summary with title and content
 * 17. Verify report.target_comment is null (since this is a post report)
 * 18. Verify timestamps (created_at, updated_at) are present
 * 19. Verify resolution and moderator_notes are null for pending reports
 */
export async function test_api_report_detail_retrieval(
  connection: api.IConnection,
) {
  // 1. Authenticate as moderator
  const moderatorData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    nickname: RandomGenerator.name(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCommunityCommunityModerator.ICreate;

  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);

  // 2. Create community for content context
  const communityData = {
    name: RandomGenerator.alphaNumeric(10).toLowerCase(),
    display_title: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    rules: RandomGenerator.paragraph({ sentences: 3 }),
    icon_url: typia.random<string & tags.Format<"uri">>(),
    banner_url: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCommunityCommunity.ICreate;

  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: communityData,
      },
    );
  typia.assert(community);

  // 3. Authenticate as member to create reportable content
  const memberData = {
    username: RandomGenerator.alphaNumeric(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    avatar_url: typia.random<string & tags.Format<"uri">>(),
    show_online_status: false,
    show_subscribed_communities: false,
    show_activity_feed: true,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCommunityGuest.ICreate;

  const member: IRedditCommunityGuest.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(member);

  // 4. Create a post with specific content
  const postData = {
    community_id: community.id,
    title: RandomGenerator.paragraph({ sentences: 1 }),
    post_type: "text" as const,
    body: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies IRedditCommunityPost.ICreate;

  const post: IRedditCommunityPost =
    await api.functional.redditCommunity.member.posts.create(connection, {
      body: postData,
    });
  typia.assert(post);

  // 5. Submit a content violation report with category 'harassment' and detailed description
  const reportDescription = RandomGenerator.paragraph({ sentences: 3 });
  const reportData = {
    content_type: "post" as const,
    target_content_id: post.id,
    reddit_community_community_id: community.id,
    category: "harassment" as const,
    description: reportDescription,
  } satisfies IRedditCommunityReport.ICreate;

  const createdReport: IRedditCommunityReport =
    await api.functional.redditCommunity.member.reports.create(connection, {
      body: reportData,
    });
  typia.assert(createdReport);

  // 6. Authenticate back as moderator
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorData.email,
      password: moderatorData.password,
      ip: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityCommunityModerator.ILogin,
  });

  // 7. Retrieve the report by its ID
  const retrievedReport: IRedditCommunityReport =
    await api.functional.redditCommunity.moderator.reports.at(connection, {
      reportId: createdReport.id,
    });
  typia.assert(retrievedReport);

  // 8-19. Validate all aspects of the report response
  TestValidator.equals(
    "report ID matches",
    retrievedReport.id,
    createdReport.id,
  );
  TestValidator.equals(
    "category is harassment",
    retrievedReport.category,
    "harassment",
  );
  TestValidator.equals(
    "description matches",
    retrievedReport.description,
    reportDescription,
  );
  TestValidator.equals(
    "content type is post",
    retrievedReport.content_type,
    "post",
  );
  TestValidator.equals("status is pending", retrievedReport.status, "pending");

  // Verify reporter information is present
  typia.assertGuard(retrievedReport.reporter!);
  TestValidator.equals(
    "reporter ID matches member",
    retrievedReport.reporter.id,
    member.id,
  );

  // Verify community information is present
  typia.assertGuard(retrievedReport.community!);
  TestValidator.equals(
    "community ID matches",
    retrievedReport.community.id,
    community.id,
  );

  // Verify target post information is present
  typia.assertGuard(retrievedReport.target_post!);
  TestValidator.equals(
    "target post ID matches",
    retrievedReport.target_post.id,
    post.id,
  );

  // Verify target comment is null
  TestValidator.equals(
    "target comment is null",
    retrievedReport.target_comment,
    null,
  );

  // Verify timestamps are present
  typia.assertGuard(retrievedReport.created_at);
  typia.assertGuard(retrievedReport.updated_at);

  // Verify resolution and moderator notes are null for pending reports
  TestValidator.equals(
    "resolution is null for pending",
    retrievedReport.resolution,
    null,
  );
  TestValidator.equals(
    "moderator notes is null for pending",
    retrievedReport.moderator_notes,
    null,
  );
}
