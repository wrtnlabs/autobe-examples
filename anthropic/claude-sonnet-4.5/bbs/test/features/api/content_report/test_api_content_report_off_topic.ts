import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";
import type { IDiscussionBoardContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentReport";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test member submitting an off-topic content report when an article doesn't
 * fit the category.
 *
 * This test validates the complete workflow for reporting off-topic content:
 *
 * 1. Setup: Create moderator, category, and two member accounts
 * 2. Article Creation: Member 1 creates an off-topic article
 * 3. Report Submission: Member 2 flags the article as off-topic
 * 4. Validation: Verify report creation with proper category and accountability
 *    tracking
 *
 * The test ensures the content moderation system properly tracks which member
 * submitted each report, enabling accountability and follow-up workflows.
 */
export async function test_api_content_report_off_topic(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account for category setup
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: "moderator123",
        username: RandomGenerator.alphaNumeric(8),
        display_name: RandomGenerator.name(),
        ip: "127.0.0.1",
        href: "https://example.com/moderator/join" satisfies string &
          tags.Format<"uri">,
        referrer: "" satisfies string & tags.Format<"uri">,
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create article category (Economic Discussion)
  const category: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: "Economic Discussion",
          slug: "economic-discussion",
          description:
            "Discussions about economics, markets, fiscal policy, and financial systems",
          sort_order: 1,
        } satisfies IDiscussionBoardArticleCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create first member account (article author)
  const member1Email = typia.random<string & tags.Format<"email">>();
  const member1: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: member1Email,
        password: "member123",
        username: RandomGenerator.alphaNumeric(10),
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
        ip: "192.168.1.100",
        href: "https://example.com/member/join" satisfies string &
          tags.Format<"uri">,
        referrer: "" satisfies string & tags.Format<"uri">,
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(member1);

  // Step 4: Member 1 creates an off-topic article (cooking recipe in Economic Discussion category)
  const offTopicArticle: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: {
        title: "Best Chocolate Chip Cookie Recipe for Weekend Baking",
        body:
          RandomGenerator.content({
            paragraphs: 3,
            sentenceMin: 15,
            sentenceMax: 20,
            wordMin: 4,
            wordMax: 8,
          }) +
          " This recipe includes flour, sugar, butter, chocolate chips, and vanilla extract. Perfect for family gatherings and celebrations.",
        discussion_board_article_category_id: category.id,
        status: "published",
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(offTopicArticle);

  // Verify article was created successfully
  TestValidator.equals(
    "article category matches economic discussion",
    offTopicArticle.category.id,
    category.id,
  );
  TestValidator.equals(
    "article status is published",
    offTopicArticle.status,
    "published",
  );

  // Step 5: Create second member account (reporter)
  const member2Email = typia.random<string & tags.Format<"email">>();
  const member2: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: member2Email,
        password: "member456",
        username: RandomGenerator.alphaNumeric(10),
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 1 }),
        ip: "192.168.1.101",
        href: "https://example.com/member/join" satisfies string &
          tags.Format<"uri">,
        referrer: "" satisfies string & tags.Format<"uri">,
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(member2);

  // Step 6: Switch to member 2 authentication
  await api.functional.auth.member.login(connection, {
    body: {
      email: member2Email,
      password: "member456",
      ip: "192.168.1.101",
      href: "https://example.com/member/login" satisfies string &
        tags.Format<"uri">,
      referrer: "https://example.com/articles" satisfies string &
        tags.Format<"uri">,
    } satisfies IDiscussionBoardMember.ILogin,
  });

  // Step 7: Member 2 submits off-topic content report
  const reportDetails =
    "This article is about cooking recipes and baking, which is completely unrelated to economic discussions. It should be posted in a general discussion or cooking category instead of Economic Discussion.";

  const contentReport: IDiscussionBoardContentReport =
    await api.functional.discussionBoard.member.contentReports.create(
      connection,
      {
        body: {
          discussion_board_article_id: offTopicArticle.id,
          report_category: "Off-Topic",
          report_details: reportDetails,
        } satisfies IDiscussionBoardContentReport.ICreate,
      },
    );
  typia.assert(contentReport);

  // Step 8: Validate report creation and properties
  TestValidator.equals(
    "report references correct article",
    contentReport.discussion_board_article_id,
    offTopicArticle.id,
  );

  TestValidator.equals(
    "report category is Off-Topic",
    contentReport.report_category,
    "Off-Topic",
  );

  TestValidator.equals(
    "report details contain explanation",
    contentReport.report_details,
    reportDetails,
  );

  TestValidator.equals(
    "report status is pending",
    contentReport.status,
    "pending",
  );

  TestValidator.equals(
    "reporting member is tracked correctly",
    contentReport.discussion_board_member_id,
    member2.id,
  );

  // Verify accountability: report is attributed to member 2, not member 1 (article author)
  TestValidator.predicate(
    "reporter is different from article author",
    contentReport.discussion_board_member_id !== offTopicArticle.author.id,
  );

  // Verify moderator fields are null (report not yet reviewed)
  TestValidator.equals(
    "no moderator assigned yet",
    contentReport.resolved_by_moderator_id,
    null,
  );

  TestValidator.equals(
    "no resolution notes yet",
    contentReport.resolution_notes,
    null,
  );

  TestValidator.equals(
    "no resolution timestamp yet",
    contentReport.resolved_at,
    null,
  );
}
