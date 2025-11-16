import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityReport";
import type { IRedditCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunity";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReport";

/**
 * Test filtering reports by content type (post vs comment).
 *
 * This test validates that the content_type filter correctly distinguishes
 * between post and comment reports. The test creates a mix of post reports and
 * comment reports within a community, then retrieves only comment reports using
 * the content_type filter.
 *
 * Test workflow:
 *
 * 1. Create moderator account and authenticate
 * 2. Create test community
 * 3. Create member accounts for content creation
 * 4. Create posts for post reports
 * 5. Create comments on posts for comment reports
 * 6. Create mix of post and comment reports
 * 7. Filter reports by content_type="comment"
 * 8. Validate only comment reports are returned
 */
export async function test_api_community_reports_filtered_by_content_type(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderatorData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
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

  // Step 2: Create community
  const communityData = {
    name: RandomGenerator.alphabets(10),
    display_title: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    rules: RandomGenerator.paragraph({ sentences: 2 }),
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

  // Step 3: Create member accounts for reporting
  const reporterData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
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

  const reporter: IRedditCommunityGuest.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: reporterData,
    });
  typia.assert(reporter);

  // Step 4: Create posts for post reports
  const postData1 = {
    community_id: community.id,
    title: RandomGenerator.paragraph({ sentences: 1 }),
    post_type: "text" as const,
    body: RandomGenerator.content({ paragraphs: 2 }),
    url: null,
    image_url: null,
  } satisfies IRedditCommunityPost.ICreate;

  const post1: IRedditCommunityPost =
    await api.functional.redditCommunity.member.posts.create(connection, {
      body: postData1,
    });
  typia.assert(post1);

  const postData2 = {
    community_id: community.id,
    title: RandomGenerator.paragraph({ sentences: 1 }),
    post_type: "text" as const,
    body: RandomGenerator.content({ paragraphs: 2 }),
    url: null,
    image_url: null,
  } satisfies IRedditCommunityPost.ICreate;

  const post2: IRedditCommunityPost =
    await api.functional.redditCommunity.member.posts.create(connection, {
      body: postData2,
    });
  typia.assert(post2);

  // Step 5: Create comments for comment reports
  const commentData1 = {
    body: RandomGenerator.paragraph({ sentences: 3 }),
    parent_comment_id: null,
  } satisfies IRedditCommunityComment.ICreate;

  const comment1: IRedditCommunityComment =
    await api.functional.redditCommunity.member.posts.comments.create(
      connection,
      {
        postId: post1.id,
        body: commentData1,
      },
    );
  typia.assert(comment1);

  const commentData2 = {
    body: RandomGenerator.paragraph({ sentences: 3 }),
    parent_comment_id: null,
  } satisfies IRedditCommunityComment.ICreate;

  const comment2: IRedditCommunityComment =
    await api.functional.redditCommunity.member.posts.comments.create(
      connection,
      {
        postId: post2.id,
        body: commentData2,
      },
    );
  typia.assert(comment2);

  // Step 6: Create mix of post and comment reports
  const postReportData1 = {
    content_type: "post" as const,
    target_content_id: post1.id,
    reddit_community_community_id: community.id,
    category: "spam" as const,
    description: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IRedditCommunityReport.ICreate;

  const postReport1: IRedditCommunityReport =
    await api.functional.redditCommunity.member.reports.create(connection, {
      body: postReportData1,
    });
  typia.assert(postReport1);

  const postReportData2 = {
    content_type: "post" as const,
    target_content_id: post2.id,
    reddit_community_community_id: community.id,
    category: "harassment" as const,
    description: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IRedditCommunityReport.ICreate;

  const postReport2: IRedditCommunityReport =
    await api.functional.redditCommunity.member.reports.create(connection, {
      body: postReportData2,
    });
  typia.assert(postReport2);

  const commentReportData1 = {
    content_type: "comment" as const,
    target_content_id: comment1.id,
    reddit_community_community_id: community.id,
    category: "hate_speech" as const,
    description: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IRedditCommunityReport.ICreate;

  const commentReport1: IRedditCommunityReport =
    await api.functional.redditCommunity.member.reports.create(connection, {
      body: commentReportData1,
    });
  typia.assert(commentReport1);

  const commentReportData2 = {
    content_type: "comment" as const,
    target_content_id: comment2.id,
    reddit_community_community_id: community.id,
    category: "misinformation" as const,
    description: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IRedditCommunityReport.ICreate;

  const commentReport2: IRedditCommunityReport =
    await api.functional.redditCommunity.member.reports.create(connection, {
      body: commentReportData2,
    });
  typia.assert(commentReport2);

  // Step 7: Switch to moderator and filter reports by content_type="comment"
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorData.email,
      password: moderatorData.password,
      ip: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityCommunityModerator.ILogin,
  });

  const filterRequest = {
    page: 1,
    limit: 10,
    content_type: "comment" as const,
  } satisfies IRedditCommunityReport.IRequest;

  const filteredReports: IPageIRedditCommunityReport.ISummary =
    await api.functional.redditCommunity.moderator.communities.reports.index(
      connection,
      {
        communityName: community.name,
        body: filterRequest,
      },
    );
  typia.assert(filteredReports);

  // Step 8: Validate that only comment reports are returned
  TestValidator.predicate(
    "filtered reports should contain data",
    filteredReports.data.length > 0,
  );

  TestValidator.predicate(
    "all returned reports should have content_type comment",
    filteredReports.data.every((report) => report.content_type === "comment"),
  );

  TestValidator.predicate(
    "no post reports should be in filtered results",
    filteredReports.data.every((report) => report.content_type !== "post"),
  );

  TestValidator.predicate(
    "at least 2 comment reports should be returned",
    filteredReports.data.length >= 2,
  );
}
