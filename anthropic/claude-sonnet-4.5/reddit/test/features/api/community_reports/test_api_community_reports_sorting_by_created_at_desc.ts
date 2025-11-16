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
 * Test sorting reports by creation timestamp in descending order (newest
 * first).
 *
 * This test validates the report sorting functionality by:
 *
 * 1. Setting up moderator and member accounts with proper authentication
 * 2. Creating a community for hosting content
 * 3. Creating multiple posts as targets for reporting
 * 4. Submitting multiple reports at different times with delays to ensure distinct
 *    timestamps
 * 5. Retrieving reports with sort_by=created_at and sort_order=desc
 * 6. Validating that reports are returned in correct reverse chronological order
 *    (newest first)
 */
export async function test_api_community_reports_sorting_by_created_at_desc(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: "moderator123",
      nickname: RandomGenerator.name(),
      ip: null,
      href: "https://test.example.com/moderator/join" satisfies string &
        tags.Format<"uri">,
      referrer: "" satisfies string & tags.Format<"uri">,
    } satisfies IRedditCommunityCommunityModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create a community
  const community =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          display_title: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          rules: RandomGenerator.paragraph({ sentences: 3 }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
          banner_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: Create and authenticate member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(12),
      email: memberEmail,
      password: "member123",
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
      show_online_status: false,
      show_subscribed_communities: false,
      show_activity_feed: true,
      ip: null,
      href: "https://test.example.com/member/join" satisfies string &
        tags.Format<"uri">,
      referrer: "" satisfies string & tags.Format<"uri">,
    } satisfies IRedditCommunityGuest.ICreate,
  });
  typia.assert(member);

  // Step 4: Create multiple posts to serve as targets for reports
  const posts = await ArrayUtil.asyncRepeat(5, async (index) => {
    const post = await api.functional.redditCommunity.member.posts.create(
      connection,
      {
        body: {
          community_id: community.id,
          title: `Test Post ${index + 1} - ${RandomGenerator.paragraph({ sentences: 2 })}`,
          post_type: "text",
          body: RandomGenerator.content({ paragraphs: 3 }),
          url: null,
          image_url: null,
        } satisfies IRedditCommunityPost.ICreate,
      },
    );
    typia.assert(post);
    return post;
  });

  // Step 5: Create multiple reports with time delays to ensure distinct timestamps
  const reportCategories = [
    "spam",
    "harassment",
    "misinformation",
    "hate_speech",
    "other",
  ] as const;
  const createdReports: IRedditCommunityReport[] = [];

  for (let i = 0; i < 5; i++) {
    const report = await api.functional.redditCommunity.member.reports.create(
      connection,
      {
        body: {
          content_type: "post",
          target_content_id: posts[i].id,
          reddit_community_community_id: community.id,
          category: reportCategories[i],
          description:
            reportCategories[i] === "other"
              ? `Report ${i + 1}: ${RandomGenerator.paragraph({ sentences: 2 })}`
              : RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IRedditCommunityReport.ICreate,
      },
    );
    typia.assert(report);
    createdReports.push(report);

    // Add delay between report creations to ensure distinct timestamps
    if (i < 4) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  // Step 6: Switch back to moderator account to retrieve reports
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: "moderator123",
      ip: null,
      href: "https://test.example.com/moderator/login" satisfies string &
        tags.Format<"uri">,
      referrer: "" satisfies string & tags.Format<"uri">,
    } satisfies IRedditCommunityCommunityModerator.ILogin,
  });

  // Step 7: Retrieve reports sorted by created_at in descending order
  const sortedReports =
    await api.functional.redditCommunity.moderator.communities.reports.index(
      connection,
      {
        communityName: community.name,
        body: {
          page: 1,
          limit: 10,
          sort_by: "created_at",
          sort_order: "desc",
        } satisfies IRedditCommunityReport.IRequest,
      },
    );
  typia.assert(sortedReports);

  // Step 8: Validate that reports are in descending chronological order (newest first)
  TestValidator.predicate(
    "should have all created reports in response",
    sortedReports.data.length >= 5,
  );

  // Verify descending order by comparing consecutive timestamps
  for (let i = 0; i < sortedReports.data.length - 1; i++) {
    const current = new Date(sortedReports.data[i].created_at).getTime();
    const next = new Date(sortedReports.data[i + 1].created_at).getTime();

    TestValidator.predicate(
      `report at index ${i} should have created_at >= report at index ${i + 1}`,
      current >= next,
    );
  }

  // Verify the first report is the most recently created
  const expectedNewestReport = createdReports[createdReports.length - 1];
  TestValidator.equals(
    "first report in sorted list should be the most recently created",
    sortedReports.data[0].id,
    expectedNewestReport.id,
  );
}
