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
 * Test community consensus detection through multiple independent reports on
 * the same article.
 *
 * This test validates that the discussion board platform properly handles
 * multiple members reporting the same article independently. The system
 * should:
 *
 * - Allow multiple distinct report records for the same article
 * - Track each reporter separately with unique report IDs
 * - Initialize each report with "pending" status
 * - Enable independent resolution of each report by moderators
 *
 * Workflow:
 *
 * 1. Create moderator and establish category infrastructure
 * 2. Create first member who authors the article to be reported
 * 3. Create the article that will receive multiple reports
 * 4. Create second member who will submit the first report
 * 5. Second member submits content report for the article
 * 6. First member (article author) submits their own report for their article
 * 7. Validate both reports exist as distinct records with separate IDs
 * 8. Verify each report tracks its respective reporter correctly
 * 9. Confirm both reports have "pending" status for moderator review
 */
export async function test_api_content_report_multiple_reports_same_article(
  connection: api.IConnection,
) {
  // Step 1: Create moderator for category setup
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: "moderator123",
        username: RandomGenerator.name(1),
        href: "https://test.example.com/moderator/join",
        referrer: "https://test.example.com/",
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create article category
  const category: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: "General Discussion",
          slug: "general-discussion",
          description: "General topics for community discussion",
          sort_order: 1,
        } satisfies IDiscussionBoardArticleCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create first member (article author)
  const member1Email = typia.random<string & tags.Format<"email">>();
  const member1: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: member1Email,
        password: "password123",
        username: RandomGenerator.name(1),
        display_name: RandomGenerator.name(2),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
        href: "https://test.example.com/member/join",
        referrer: "https://test.example.com/",
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(member1);

  // Step 4: Member 1 creates an article
  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 5,
          wordMax: 10,
        }),
        body: RandomGenerator.content({
          paragraphs: 3,
          sentenceMin: 10,
          sentenceMax: 20,
        }),
        discussion_board_article_category_id: category.id,
        status: "published",
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(article);

  // Step 5: Create second member (first reporter)
  const member2Email = typia.random<string & tags.Format<"email">>();
  const member2: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: member2Email,
        password: "password456",
        username: RandomGenerator.name(1),
        display_name: RandomGenerator.name(2),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
        href: "https://test.example.com/member/join",
        referrer: "https://test.example.com/",
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(member2);

  // Step 6: Member 2 submits first content report
  const reportCategories = [
    "Spam",
    "Offensive Content",
    "Misinformation",
    "Off-Topic",
    "Other",
  ] as const;
  const report1: IDiscussionBoardContentReport =
    await api.functional.discussionBoard.member.contentReports.create(
      connection,
      {
        body: {
          discussion_board_article_id: article.id,
          report_category: RandomGenerator.pick(reportCategories),
          report_details: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IDiscussionBoardContentReport.ICreate,
      },
    );
  typia.assert(report1);

  // Step 7: Switch to member 1 (article author)
  const member1Login: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.login(connection, {
      body: {
        email: member1Email,
        password: "password123",
        href: "https://test.example.com/member/login",
        referrer: "https://test.example.com/articles",
      } satisfies IDiscussionBoardMember.ILogin,
    });
  typia.assert(member1Login);

  // Step 8: Member 1 submits second content report for their own article
  const report2: IDiscussionBoardContentReport =
    await api.functional.discussionBoard.member.contentReports.create(
      connection,
      {
        body: {
          discussion_board_article_id: article.id,
          report_category: RandomGenerator.pick(reportCategories),
          report_details: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IDiscussionBoardContentReport.ICreate,
      },
    );
  typia.assert(report2);

  // Step 9: Validate both reports are distinct records
  TestValidator.notEquals(
    "reports should have different IDs",
    report1.id,
    report2.id,
  );

  // Step 10: Verify both reports reference the same article
  TestValidator.equals(
    "report 1 references correct article",
    report1.discussion_board_article_id,
    article.id,
  );
  TestValidator.equals(
    "report 2 references correct article",
    report2.discussion_board_article_id,
    article.id,
  );

  // Step 11: Verify each report tracks its respective reporter
  TestValidator.equals(
    "report 1 tracks member 2 as reporter",
    report1.discussion_board_member_id,
    member2.id,
  );
  TestValidator.equals(
    "report 2 tracks member 1 as reporter",
    report2.discussion_board_member_id,
    member1.id,
  );

  // Step 12: Verify both reports have pending status
  TestValidator.equals(
    "report 1 has pending status",
    report1.status,
    "pending",
  );
  TestValidator.equals(
    "report 2 has pending status",
    report2.status,
    "pending",
  );

  // Step 13: Verify reports are independent (can be resolved separately)
  TestValidator.predicate(
    "report 1 has no resolution data",
    report1.resolved_by_moderator_id === null ||
      report1.resolved_by_moderator_id === undefined,
  );
  TestValidator.predicate(
    "report 2 has no resolution data",
    report2.resolved_by_moderator_id === null ||
      report2.resolved_by_moderator_id === undefined,
  );
  TestValidator.predicate(
    "report 1 has no resolution timestamp",
    report1.resolved_at === null || report1.resolved_at === undefined,
  );
  TestValidator.predicate(
    "report 2 has no resolution timestamp",
    report2.resolved_at === null || report2.resolved_at === undefined,
  );
}
