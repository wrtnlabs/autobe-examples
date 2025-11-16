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

export async function test_api_community_reports_pagination_navigation(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: "ModPass123!",
      nickname: RandomGenerator.name(2),
      ip: null,
      href: "https://test.com/moderator/join" satisfies string &
        tags.Format<"uri">,
      referrer: "" satisfies string & tags.Format<"uri">,
    } satisfies IRedditCommunityCommunityModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Moderator creates a community
  const communityName = RandomGenerator.alphaNumeric(15);
  const community =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: communityName,
          display_title: RandomGenerator.paragraph({ sentences: 3 }),
          description: RandomGenerator.paragraph({ sentences: 10 }),
          rules: RandomGenerator.paragraph({ sentences: 5 }),
          icon_url: "https://example.com/icon.png" satisfies string &
            tags.Format<"uri"> as
            | (string & tags.Format<"uri">)
            | null
            | undefined,
          banner_url: null,
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: Create member account for reporting
  const memberEmail = typia.random<string & tags.Format<"email">>();
  await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      email: memberEmail,
      password: "MemberPass123!",
      display_name: RandomGenerator.name(2),
      bio: null,
      avatar_url: null,
      show_online_status: undefined,
      show_subscribed_communities: undefined,
      show_activity_feed: undefined,
      ip: null,
      href: "https://test.com/member/join" satisfies string &
        tags.Format<"uri">,
      referrer: "" satisfies string & tags.Format<"uri">,
    } satisfies IRedditCommunityGuest.ICreate,
  });

  // Step 4: Member creates 25 posts for reporting
  const reportCategories = [
    "spam",
    "harassment",
    "hate_speech",
    "misinformation",
    "sexual_content",
    "violence",
    "personal_information",
    "copyright",
    "self_harm",
    "other",
  ] as const;
  const postIds: string[] = [];

  const postsToCreate = 25;
  for (let i = 0; i < postsToCreate; i++) {
    const post = await api.functional.redditCommunity.member.posts.create(
      connection,
      {
        body: {
          community_id: community.id,
          title: `Test Post ${i + 1} - ${RandomGenerator.paragraph({ sentences: 2 })}`,
          post_type: "text" as const,
          body: RandomGenerator.content({ paragraphs: 2 }),
          url: null,
          image_url: null,
        } satisfies IRedditCommunityPost.ICreate,
      },
    );
    typia.assert(post);
    postIds.push(post.id);
  }

  // Step 5: Member reports all posts
  for (let i = 0; i < postIds.length; i++) {
    const category = reportCategories[i % reportCategories.length];
    await api.functional.redditCommunity.member.reports.create(connection, {
      body: {
        content_type: "post" as const,
        target_content_id: postIds[i],
        reddit_community_community_id: community.id,
        category: category,
        description:
          category === "other"
            ? RandomGenerator.paragraph({ sentences: 2 })
            : null,
      } satisfies IRedditCommunityReport.ICreate,
    });
  }

  // Step 6: Switch back to moderator to query paginated reports
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: "ModPass123!",
      ip: null,
      href: "https://test.com/moderator/login" satisfies string &
        tags.Format<"uri">,
      referrer: "" satisfies string & tags.Format<"uri">,
    } satisfies IRedditCommunityCommunityModerator.ILogin,
  });

  // Step 7: Test pagination - Page 1
  const page1 =
    await api.functional.redditCommunity.moderator.communities.reports.index(
      connection,
      {
        communityName: communityName,
        body: {
          page: 1,
          limit: 10,
        } satisfies IRedditCommunityReport.IRequest,
      },
    );
  typia.assert(page1);

  // Validate page 1 metadata
  TestValidator.equals("page 1 current page", page1.pagination.current, 0);
  TestValidator.equals("page 1 limit", page1.pagination.limit, 10);
  TestValidator.equals(
    "page 1 total records",
    page1.pagination.records,
    postsToCreate,
  );
  TestValidator.equals("page 1 total pages", page1.pagination.pages, 3);
  TestValidator.equals("page 1 data length", page1.data.length, 10);

  // Step 8: Test pagination - Page 2
  const page2 =
    await api.functional.redditCommunity.moderator.communities.reports.index(
      connection,
      {
        communityName: communityName,
        body: {
          page: 2,
          limit: 10,
        } satisfies IRedditCommunityReport.IRequest,
      },
    );
  typia.assert(page2);

  // Validate page 2 metadata
  TestValidator.equals("page 2 current page", page2.pagination.current, 1);
  TestValidator.equals("page 2 limit", page2.pagination.limit, 10);
  TestValidator.equals(
    "page 2 total records",
    page2.pagination.records,
    postsToCreate,
  );
  TestValidator.equals("page 2 total pages", page2.pagination.pages, 3);
  TestValidator.equals("page 2 data length", page2.data.length, 10);

  // Step 9: Test pagination - Page 3
  const page3 =
    await api.functional.redditCommunity.moderator.communities.reports.index(
      connection,
      {
        communityName: communityName,
        body: {
          page: 3,
          limit: 10,
        } satisfies IRedditCommunityReport.IRequest,
      },
    );
  typia.assert(page3);

  // Validate page 3 metadata
  TestValidator.equals("page 3 current page", page3.pagination.current, 2);
  TestValidator.equals("page 3 limit", page3.pagination.limit, 10);
  TestValidator.equals(
    "page 3 total records",
    page3.pagination.records,
    postsToCreate,
  );
  TestValidator.equals("page 3 total pages", page3.pagination.pages, 3);
  TestValidator.equals("page 3 data length", page3.data.length, 5);

  // Step 10: Verify no duplicates across pages
  const allReportIds = new Set<string>();

  for (const report of page1.data) {
    TestValidator.predicate(
      "page 1 no duplicate IDs",
      !allReportIds.has(report.id),
    );
    allReportIds.add(report.id);
  }

  for (const report of page2.data) {
    TestValidator.predicate(
      "page 2 no duplicate IDs",
      !allReportIds.has(report.id),
    );
    allReportIds.add(report.id);
  }

  for (const report of page3.data) {
    TestValidator.predicate(
      "page 3 no duplicate IDs",
      !allReportIds.has(report.id),
    );
    allReportIds.add(report.id);
  }

  // Step 11: Verify all reports are accounted for
  TestValidator.equals(
    "total unique reports collected",
    allReportIds.size,
    postsToCreate,
  );
}
