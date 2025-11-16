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

export async function test_api_report_search_pending_status(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as moderator to establish authorization context
  const moderatorData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    nickname: RandomGenerator.name(),
    ip: null,
    href: `https://example.com/${RandomGenerator.alphaNumeric(8)}`,
    referrer: `https://example.com/${RandomGenerator.alphaNumeric(8)}`,
  } satisfies IRedditCommunityCommunityModerator.ICreate;

  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);

  // Step 2: Create a community to serve as the content container
  const communityData = {
    name: RandomGenerator.alphaNumeric(10),
    display_title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    rules: RandomGenerator.paragraph({ sentences: 3 }),
    icon_url: `https://example.com/icon/${RandomGenerator.alphaNumeric(8)}.png`,
    banner_url: `https://example.com/banner/${RandomGenerator.alphaNumeric(8)}.png`,
  } satisfies IRedditCommunityCommunity.ICreate;

  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: communityData,
      },
    );
  typia.assert(community);

  // Step 3: Authenticate as a member to create reportable content
  const memberData = {
    username: RandomGenerator.alphaNumeric(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    avatar_url: `https://example.com/avatar/${RandomGenerator.alphaNumeric(8)}.png`,
    show_online_status: false,
    show_subscribed_communities: false,
    show_activity_feed: true,
    ip: null,
    href: `https://example.com/${RandomGenerator.alphaNumeric(8)}`,
    referrer: `https://example.com/${RandomGenerator.alphaNumeric(8)}`,
  } satisfies IRedditCommunityGuest.ICreate;

  const member: IRedditCommunityGuest.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(member);

  // Step 4: Create a post within the community
  const postData = {
    community_id: community.id,
    title: RandomGenerator.paragraph({ sentences: 2 }),
    post_type: "text" as const,
    body: RandomGenerator.content({ paragraphs: 3 }),
    url: null,
    image_url: null,
  } satisfies IRedditCommunityPost.ICreate;

  const post: IRedditCommunityPost =
    await api.functional.redditCommunity.member.posts.create(connection, {
      body: postData,
    });
  typia.assert(post);

  // Step 5: Submit a content violation report for the post with category 'spam'
  const reportData = {
    content_type: "post" as const,
    target_content_id: post.id,
    reddit_community_community_id: community.id,
    category: "spam" as const,
    description: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IRedditCommunityReport.ICreate;

  const report: IRedditCommunityReport =
    await api.functional.redditCommunity.member.reports.create(connection, {
      body: reportData,
    });
  typia.assert(report);

  // Step 6: Authenticate back as the moderator
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorData.email,
      password: moderatorData.password,
      ip: null,
      href: `https://example.com/${RandomGenerator.alphaNumeric(8)}`,
      referrer: `https://example.com/${RandomGenerator.alphaNumeric(8)}`,
    } satisfies IRedditCommunityCommunityModerator.ILogin,
  });

  // Step 7: Search for reports with status filter set to 'pending'
  const searchRequest = {
    page: 1,
    limit: 10,
    status: "pending" as const,
  } satisfies IRedditCommunityReport.IRequest;

  const searchResult: IPageIRedditCommunityReport.ISummary =
    await api.functional.redditCommunity.moderator.reports.index(connection, {
      body: searchRequest,
    });
  typia.assert(searchResult);

  // Step 8: Validate that the paginated response contains the submitted report
  TestValidator.predicate(
    "search result should contain at least one report",
    searchResult.data.length > 0,
  );

  const foundReport = searchResult.data.find((r) => r.id === report.id);
  typia.assertGuard(foundReport!);

  // Step 9: Verify pagination metadata includes correct total record count
  TestValidator.predicate(
    "pagination total records should be at least 1",
    searchResult.pagination.records >= 1,
  );

  // Step 10: Confirm report summary fields include category, status, content_type, and timestamps
  TestValidator.equals(
    "report category should be spam",
    foundReport.category,
    "spam",
  );
  TestValidator.equals(
    "report status should be pending",
    foundReport.status,
    "pending",
  );
  TestValidator.equals(
    "report content_type should be post",
    foundReport.content_type,
    "post",
  );
  TestValidator.predicate(
    "report should have reporter information",
    foundReport.reporter !== undefined,
  );
  TestValidator.predicate(
    "report should have community information",
    foundReport.community !== undefined,
  );
}
