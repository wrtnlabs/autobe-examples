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
 * Test report detail retrieval across all available violation categories.
 *
 * This test validates that reports with various violation categories are
 * properly stored and retrieved. It ensures consistent handling of different
 * report types across the content moderation workflow.
 *
 * Workflow:
 *
 * 1. Authenticate as moderator and create community
 * 2. Authenticate as member and create posts for each category
 * 3. Submit reports with each violation category type
 * 4. Switch back to moderator and retrieve each report by ID
 * 5. Validate category values, descriptions, and data integrity
 * 6. Verify 'other' category requires description field
 */
export async function test_api_report_detail_all_categories(
  connection: api.IConnection,
) {
  // 1. Authenticate as moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: "moderator123",
      nickname: RandomGenerator.name(),
      ip: null,
      href: "https://example.com/moderator/join" satisfies string &
        tags.Format<"uri">,
      referrer: "" satisfies string & tags.Format<"uri">,
    } satisfies IRedditCommunityCommunityModerator.ICreate,
  });
  typia.assert(moderator);

  // 2. Create community
  const community =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10).toLowerCase(),
          display_title: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          rules: RandomGenerator.paragraph({ sentences: 3 }),
          icon_url: null,
          banner_url: null,
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 3. Authenticate as member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(8).toLowerCase(),
      email: memberEmail,
      password: "member123",
      display_name: RandomGenerator.name(),
      bio: null,
      avatar_url: null,
      show_online_status: false,
      show_subscribed_communities: false,
      show_activity_feed: true,
      ip: null,
      href: "https://example.com/member/join" satisfies string &
        tags.Format<"uri">,
      referrer: "" satisfies string & tags.Format<"uri">,
    } satisfies IRedditCommunityGuest.ICreate,
  });
  typia.assert(member);

  // 4. Create posts for each category
  const categories = [
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

  const posts = await ArrayUtil.asyncMap(categories, async (category) => {
    const post = await api.functional.redditCommunity.member.posts.create(
      connection,
      {
        body: {
          community_id: community.id,
          title: `Test post for ${category} category`,
          post_type: "text",
          body: RandomGenerator.paragraph({ sentences: 5 }),
          url: null,
          image_url: null,
        } satisfies IRedditCommunityPost.ICreate,
      },
    );
    typia.assert(post);
    return { category, post };
  });

  // 5. Submit reports with each category type
  const reports = await ArrayUtil.asyncMap(
    posts,
    async ({ category, post }) => {
      const description =
        category === "other"
          ? `Custom violation: ${RandomGenerator.paragraph({ sentences: 2 })}`
          : `Report for ${category}: ${RandomGenerator.paragraph({ sentences: 2 })}`;

      const report = await api.functional.redditCommunity.member.reports.create(
        connection,
        {
          body: {
            content_type: "post",
            target_content_id: post.id,
            reddit_community_community_id: community.id,
            category: category,
            description: description,
          } satisfies IRedditCommunityReport.ICreate,
        },
      );
      typia.assert(report);
      return { category, description, report };
    },
  );

  // 6. Switch back to moderator
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: "moderator123",
      ip: null,
      href: "https://example.com/moderator/login" satisfies string &
        tags.Format<"uri">,
      referrer: "" satisfies string & tags.Format<"uri">,
    } satisfies IRedditCommunityCommunityModerator.ILogin,
  });

  // 7. Retrieve and validate each report
  await ArrayUtil.asyncForEach(
    reports,
    async ({ category, description, report }) => {
      const retrievedReport =
        await api.functional.redditCommunity.moderator.reports.at(connection, {
          reportId: report.id,
        });
      typia.assert(retrievedReport);

      // Validate category matches
      TestValidator.equals(
        `report category should be ${category}`,
        retrievedReport.category,
        category,
      );

      // Validate description is preserved
      TestValidator.equals(
        `report description should be preserved for ${category}`,
        retrievedReport.description,
        description,
      );

      // Validate all report data is complete
      TestValidator.equals(
        "report ID should match",
        retrievedReport.id,
        report.id,
      );

      TestValidator.equals(
        "report community ID should match",
        retrievedReport.reddit_community_community_id,
        community.id,
      );

      TestValidator.equals(
        "report content type should be post",
        retrievedReport.content_type,
        "post",
      );

      // Verify status is pending for new reports
      TestValidator.equals(
        "report status should be pending",
        retrievedReport.status,
        "pending",
      );
    },
  );

  // 8. Special validation for 'other' category
  const otherReport = reports.find((r) => r.category === "other");
  typia.assertGuard(otherReport!);

  TestValidator.predicate(
    "'other' category should have description",
    otherReport.description !== null &&
      otherReport.description !== undefined &&
      otherReport.description.length > 0,
  );
}
