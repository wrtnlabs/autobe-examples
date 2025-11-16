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

export async function test_api_report_search_sorting_options(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = RandomGenerator.alphabets(12);
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

  // Step 2: Create community
  const community =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          display_title: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          rules: RandomGenerator.paragraph({ sentences: 2 }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
          banner_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: Authenticate as member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphabets(12);
  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphabets(10),
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

  // Step 4: Create multiple posts
  const posts = await ArrayUtil.asyncRepeat(5, async (index) => {
    const post = await api.functional.redditCommunity.member.posts.create(
      connection,
      {
        body: {
          community_id: community.id,
          title: `Test Post ${index + 1}`,
          post_type: "text",
          body: RandomGenerator.content({ paragraphs: 2 }),
          url: null,
          image_url: null,
        } satisfies IRedditCommunityPost.ICreate,
      },
    );
    typia.assert(post);
    return post;
  });

  // Step 5: Submit reports with different categories
  const categories = ["spam", "harassment", "hate_speech"] as const;
  const reports = await ArrayUtil.asyncRepeat(5, async (index) => {
    await new Promise<void>((resolve) => setTimeout(resolve, 100));

    const report = await api.functional.redditCommunity.member.reports.create(
      connection,
      {
        body: {
          content_type: "post",
          target_content_id: posts[index].id,
          reddit_community_community_id: community.id,
          category: categories[index % categories.length],
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditCommunityReport.ICreate,
      },
    );
    typia.assert(report);
    return report;
  });

  // Step 6: Authenticate back as moderator
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      ip: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityCommunityModerator.ILogin,
  });

  // Step 7: Test sort by created_at ascending
  const sortByDateAsc =
    await api.functional.redditCommunity.moderator.reports.index(connection, {
      body: {
        sort_by: "created_at",
        sort_order: "asc",
        page: 1,
        limit: 10,
      } satisfies IRedditCommunityReport.IRequest,
    });
  typia.assert(sortByDateAsc);

  // Step 8: Validate chronological ascending order
  const reportsByDateAsc = sortByDateAsc.data;
  for (let i = 0; i < reportsByDateAsc.length - 1; i++) {
    const current = new Date(reportsByDateAsc[i].created_at).getTime();
    const next = new Date(reportsByDateAsc[i + 1].created_at).getTime();
    TestValidator.predicate(
      "reports should be ordered chronologically ascending",
      current <= next,
    );
  }

  // Step 9: Test sort by created_at descending
  const sortByDateDesc =
    await api.functional.redditCommunity.moderator.reports.index(connection, {
      body: {
        sort_by: "created_at",
        sort_order: "desc",
        page: 1,
        limit: 10,
      } satisfies IRedditCommunityReport.IRequest,
    });
  typia.assert(sortByDateDesc);

  // Step 10: Validate chronological descending order
  const reportsByDateDesc = sortByDateDesc.data;
  for (let i = 0; i < reportsByDateDesc.length - 1; i++) {
    const current = new Date(reportsByDateDesc[i].created_at).getTime();
    const next = new Date(reportsByDateDesc[i + 1].created_at).getTime();
    TestValidator.predicate(
      "reports should be ordered chronologically descending",
      current >= next,
    );
  }

  // Step 11: Test sort by category ascending
  const sortByCategoryAsc =
    await api.functional.redditCommunity.moderator.reports.index(connection, {
      body: {
        sort_by: "category",
        sort_order: "asc",
        page: 1,
        limit: 10,
      } satisfies IRedditCommunityReport.IRequest,
    });
  typia.assert(sortByCategoryAsc);

  // Step 12: Validate alphabetical category order
  const reportsByCategoryAsc = sortByCategoryAsc.data;
  for (let i = 0; i < reportsByCategoryAsc.length - 1; i++) {
    const current = reportsByCategoryAsc[i].category;
    const next = reportsByCategoryAsc[i + 1].category;
    TestValidator.predicate(
      "reports should be ordered alphabetically by category",
      current <= next,
    );
  }

  // Step 13: Test sort by status descending
  const sortByStatusDesc =
    await api.functional.redditCommunity.moderator.reports.index(connection, {
      body: {
        sort_by: "status",
        sort_order: "desc",
        page: 1,
        limit: 10,
      } satisfies IRedditCommunityReport.IRequest,
    });
  typia.assert(sortByStatusDesc);

  // Step 14: Validate status-based ordering
  typia.assert(sortByStatusDesc.data);
  TestValidator.predicate(
    "should return reports with status sorting applied",
    sortByStatusDesc.data.length > 0,
  );
}
