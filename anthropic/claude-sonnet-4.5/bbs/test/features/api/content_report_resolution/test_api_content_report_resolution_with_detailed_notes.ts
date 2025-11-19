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
 * Test moderator providing comprehensive resolution notes explaining their
 * decision-making process.
 *
 * This test validates the complete content report resolution workflow with
 * detailed moderator notes. It creates the full reporting workflow, then has
 * the moderator resolve the report with extensive resolution notes that cite
 * specific community guidelines, explain the reasoning, and provide educational
 * context for the reporting member.
 *
 * The test verifies that:
 *
 * 1. The resolution_notes field accepts lengthy explanatory text
 * 2. All resolution metadata is properly recorded (resolved_by_moderator_id,
 *    resolved_at, status)
 * 3. The transparency requirement for moderator accountability is satisfied
 *    through detailed documentation
 */
export async function test_api_content_report_resolution_with_detailed_notes(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account for infrastructure and report resolution
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "SecureMod123!";

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      username: RandomGenerator.alphaNumeric(8),
      display_name: RandomGenerator.name(2),
      ip: "192.168.1.100",
      href: "https://discussionboard.example.com/moderator/join" satisfies string &
        tags.Format<"uri">,
      referrer: "https://discussionboard.example.com" satisfies string &
        tags.Format<"uri">,
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create category needed for article creation
  const category =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: "Economic Discussion",
          slug: "economic-discussion",
          description:
            "Discussions about economic policies, markets, and fiscal topics",
          sort_order: 1,
        } satisfies IDiscussionBoardArticleCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create member account to create content and submit reports
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "MemberPass456!";

  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      username: RandomGenerator.alphaNumeric(10),
      display_name: RandomGenerator.name(2),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      ip: "192.168.1.50",
      href: "https://discussionboard.example.com/member/join" satisfies string &
        tags.Format<"uri">,
      referrer: "https://discussionboard.example.com/home" satisfies string &
        tags.Format<"uri">,
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  // Step 4: Create article to be reported and reviewed
  const article = await api.functional.discussionBoard.member.articles.create(
    connection,
    {
      body: {
        title: "Analysis of Current Economic Trends and Market Predictions",
        body: RandomGenerator.content({
          paragraphs: 3,
          sentenceMin: 10,
          sentenceMax: 20,
        }),
        discussion_board_article_category_id: category.id,
        status: "published",
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);

  // Step 5: Submit content report flagging policy violations
  const reportCategories = [
    "Spam",
    "Offensive Content",
    "Misinformation",
    "Off-Topic",
    "Other",
  ] as const;
  const selectedCategory = RandomGenerator.pick(reportCategories);

  const contentReport =
    await api.functional.discussionBoard.member.contentReports.create(
      connection,
      {
        body: {
          discussion_board_article_id: article.id,
          report_category: selectedCategory,
          report_details:
            "This article contains misleading information about economic indicators and does not cite credible sources. The claims made about market predictions are not supported by evidence and could mislead readers who rely on accurate economic analysis.",
        } satisfies IDiscussionBoardContentReport.ICreate,
      },
    );
  typia.assert(contentReport);

  // Verify initial report state
  TestValidator.equals(
    "report status is pending",
    contentReport.status,
    "pending",
  );
  TestValidator.equals(
    "report category matches",
    contentReport.report_category,
    selectedCategory,
  );
  TestValidator.equals(
    "reported article ID matches",
    contentReport.discussion_board_article_id,
    article.id,
  );
  TestValidator.equals(
    "reporting member ID matches",
    contentReport.discussion_board_member_id,
    member.id,
  );
  TestValidator.equals(
    "resolved_by_moderator_id is initially null",
    contentReport.resolved_by_moderator_id,
    null,
  );
  TestValidator.equals(
    "resolution_notes is initially null",
    contentReport.resolution_notes,
    null,
  );
  TestValidator.equals(
    "resolved_at is initially null",
    contentReport.resolved_at,
    null,
  );

  // Step 6: Switch to moderator account for report resolution
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      ip: "192.168.1.100",
      href: "https://discussionboard.example.com/moderator/login" satisfies string &
        tags.Format<"uri">,
      referrer:
        "https://discussionboard.example.com/moderator/dashboard" satisfies string &
          tags.Format<"uri">,
    } satisfies IDiscussionBoardModerator.ILogin,
  });

  // Step 7: Moderator resolves report with extensive resolution notes
  const comprehensiveResolutionNotes = `After thorough review of the reported article and the community guidelines, I have determined that this report requires action. Here is my detailed analysis:

**Community Guideline Reference:**
This article has been evaluated against Section 3.2 of our Community Guidelines regarding "Accuracy and Evidence-Based Discussion" and Section 4.1 regarding "Misinformation and Misleading Content."

**Reasoning for Decision:**
The reported article makes several claims about economic market predictions without providing credible sources or supporting evidence. Specifically:
1. The assertion that "markets will crash by 30% in the next quarter" lacks citation from reputable economic institutions
2. Statistical claims about unemployment rates do not reference official government data sources
3. The author presents opinion as fact without clearly distinguishing personal analysis from verified information

**Action Taken:**
I have reviewed the article content and determined that while the discussion topic is relevant to our Economic Discussion category, the presentation violates our evidence-based discussion standards. The article has been edited to include disclaimer language at the beginning, noting that the content represents personal analysis and should not be taken as professional financial advice.

**Educational Context for Reporter:**
Thank you for bringing this to our attention. Your report demonstrates excellent understanding of our community standards regarding evidence-based discussion. When reporting similar content in the future, you may also reference specific claims or paragraphs that concern you, which helps moderators conduct more targeted reviews.

**Transparency Note:**
This moderation decision was made by ${moderator.username} on ${new Date().toISOString()}. The article author has been notified of the edits and has been provided with resources on how to properly cite sources in economic discussions. No punitive action has been taken against the author's account at this time, as this appears to be a good-faith attempt at discussion rather than intentional misinformation.

**Community Impact:**
This decision helps maintain the integrity of our economic discussions while preserving the opportunity for diverse perspectives. Members can continue to share analyses and predictions, but must clearly distinguish between verified data and personal opinion.`;

  const resolvedReport =
    await api.functional.discussionBoard.moderator.contentReports.update(
      connection,
      {
        reportId: contentReport.id,
        body: {
          status: "reviewed_edited",
          resolution_notes: comprehensiveResolutionNotes,
        } satisfies IDiscussionBoardContentReport.IUpdate,
      },
    );
  typia.assert(resolvedReport);

  // Validate resolution metadata
  TestValidator.equals(
    "report status updated to reviewed_edited",
    resolvedReport.status,
    "reviewed_edited",
  );
  TestValidator.equals(
    "resolution_notes contains comprehensive explanation",
    resolvedReport.resolution_notes,
    comprehensiveResolutionNotes,
  );
  TestValidator.equals(
    "resolved_by_moderator_id is set",
    resolvedReport.resolved_by_moderator_id,
    moderator.id,
  );

  // Verify resolved_at timestamp is set and recent
  typia.assertGuard(resolvedReport.resolved_at!);
  const resolvedAt = new Date(resolvedReport.resolved_at);
  const now = new Date();
  const timeDifference = now.getTime() - resolvedAt.getTime();
  TestValidator.predicate(
    "resolved_at is recent (within 1 minute)",
    timeDifference < 60000,
  );

  // Validate that lengthy explanatory text is properly stored
  TestValidator.predicate(
    "resolution_notes is lengthy and detailed",
    comprehensiveResolutionNotes.length > 500,
  );
  TestValidator.predicate(
    "resolution_notes contains guideline references",
    comprehensiveResolutionNotes.includes("Community Guideline"),
  );
  TestValidator.predicate(
    "resolution_notes contains reasoning section",
    comprehensiveResolutionNotes.includes("Reasoning for Decision"),
  );
  TestValidator.predicate(
    "resolution_notes contains educational context",
    comprehensiveResolutionNotes.includes("Educational Context"),
  );
  TestValidator.predicate(
    "resolution_notes contains transparency information",
    comprehensiveResolutionNotes.includes("Transparency Note"),
  );

  // Verify core report fields remain unchanged
  TestValidator.equals(
    "report category unchanged",
    resolvedReport.report_category,
    selectedCategory,
  );
  TestValidator.equals(
    "reported article ID unchanged",
    resolvedReport.discussion_board_article_id,
    article.id,
  );
  TestValidator.equals(
    "reporting member ID unchanged",
    resolvedReport.discussion_board_member_id,
    member.id,
  );
  TestValidator.equals(
    "report details unchanged",
    resolvedReport.report_details,
    contentReport.report_details,
  );
  TestValidator.equals(
    "created_at timestamp unchanged",
    resolvedReport.created_at,
    contentReport.created_at,
  );
}
