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
 * Test comprehensive report submission across all supported violation
 * categories.
 *
 * Validates that the reporting system correctly handles the full spectrum of
 * content policy violations by submitting reports for all 10 violation
 * categories and verifying proper storage, status, and categorization.
 *
 * Workflow:
 *
 * 1. Create moderator account and community
 * 2. Create member accounts for post authorship and reporting
 * 3. Create multiple posts (one for each category test)
 * 4. Submit reports covering each violation category
 * 5. Validate report creation, category storage, and status
 */
export async function test_api_post_report_submission_all_violation_categories(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: RandomGenerator.alphaNumeric(12),
      nickname: RandomGenerator.name(),
      ip: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityCommunityModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create community to host posts
  const community =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: typia.random<
            string &
              tags.MinLength<3> &
              tags.MaxLength<21> &
              tags.Pattern<"^[a-z0-9_]+$">
          >(),
          display_title: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          rules: RandomGenerator.paragraph({ sentences: 2 }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
          banner_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: Create member account for post creation
  const postAuthorEmail = typia.random<string & tags.Format<"email">>();
  const postAuthor = await api.functional.auth.member.join(connection, {
    body: {
      username: typia.random<string & tags.MinLength<3> & tags.MaxLength<50>>(),
      email: postAuthorEmail,
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
    } satisfies IRedditCommunityGuest.ICreate,
  });
  typia.assert(postAuthor);

  // Step 4: Create 10 posts (one for each violation category)
  const violationCategories = [
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

  const posts = await ArrayUtil.asyncRepeat(10, async (index) => {
    const post = await api.functional.redditCommunity.member.posts.create(
      connection,
      {
        body: {
          community_id: community.id,
          title: `Test Post ${index + 1}: ${RandomGenerator.name(3)}`,
          post_type: "text" as const,
          body: RandomGenerator.content({ paragraphs: 2 }),
          url: null,
          image_url: null,
        } satisfies IRedditCommunityPost.ICreate,
      },
    );
    typia.assert(post);
    return post;
  });

  // Step 5: Create reporter member accounts and submit reports for all categories
  const reports = await ArrayUtil.asyncMap(
    violationCategories,
    async (category, index) => {
      // Create unique reporter for each category
      const reporterEmail = typia.random<string & tags.Format<"email">>();
      const reporter = await api.functional.auth.member.join(connection, {
        body: {
          username: typia.random<
            string & tags.MinLength<3> & tags.MaxLength<50>
          >(),
          email: reporterEmail,
          password: RandomGenerator.alphaNumeric(12),
          display_name: RandomGenerator.name(),
          bio: null,
          avatar_url: null,
          show_online_status: false,
          show_subscribed_communities: false,
          show_activity_feed: true,
          ip: null,
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditCommunityGuest.ICreate,
      });
      typia.assert(reporter);

      // Submit report with current category
      const report =
        await api.functional.redditCommunity.member.posts.reports.create(
          connection,
          {
            postId: posts[index].id,
            body: {
              content_type: "post" as const,
              target_content_id: posts[index].id,
              reddit_community_community_id: community.id,
              category: category,
              description:
                category === "other"
                  ? RandomGenerator.paragraph({ sentences: 2 })
                  : null,
            } satisfies IRedditCommunityReport.ICreate,
          },
        );
      typia.assert(report);
      return report;
    },
  );

  // Step 6: Validate all reports
  TestValidator.equals("total reports count", reports.length, 10);

  // Validate each category was correctly stored
  violationCategories.forEach((category, index) => {
    TestValidator.equals(
      `report ${index + 1} category matches ${category}`,
      reports[index].category,
      category,
    );
  });

  // Validate "other" category has description
  const otherReport = reports[9];
  TestValidator.predicate(
    "other category report has description",
    otherReport.description !== null &&
      otherReport.description !== undefined &&
      otherReport.description.length > 0,
  );

  // Validate all reports are in pending status
  reports.forEach((report, index) => {
    TestValidator.equals(
      `report ${index + 1} status is pending`,
      report.status,
      "pending",
    );
  });
}
