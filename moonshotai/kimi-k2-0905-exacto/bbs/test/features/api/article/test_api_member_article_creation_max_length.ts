import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionArticle";
import type { IEconomicDiscussionAttachmentFileType } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionAttachmentFileType";
import type { IEconomicDiscussionAttachments } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionAttachments";
import type { IEconomicDiscussionCategories } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionCategories";
import type { IEconomicDiscussionCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionCategory";
import type { IEconomicDiscussionMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMember";
import type { IEconomicDiscussionMembers } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMembers";
import type { IEconomicDiscussionModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModerator";
import type { IEconomicDiscussionModerators } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModerators";

/**
 * Test article creation with maximum content length (50,000 characters) to
 * verify upper boundary handling and proper validation. Ensures system can
 * handle large articles without truncation or performance issues.
 *
 * Test workflow:
 *
 * 1. Create moderator account for category setup
 * 2. Create member account for article creation
 * 3. Login as member to establish authenticated session
 * 4. Create test category for article organization
 * 5. Generate maximum-length content (50,000 characters)
 * 6. Create article with maximum content length
 * 7. Verify article creation success and content integrity
 * 8. Test boundary conditions to ensure system stability
 *
 * This test validates that the economic discussion platform can handle
 * substantive economic and political analysis without artificial content length
 * restrictions while maintaining system performance and stability.
 */
export async function test_api_member_article_creation_max_length(
  connection: api.IConnection,
) {
  // Create moderator for category setup
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      username: RandomGenerator.name(),
      email: moderatorEmail,
      password_hash: RandomGenerator.alphaNumeric(12),
      moderation_level: "standard",
    } satisfies IEconomicDiscussionModerator.ICreate,
  });
  typia.assert(moderator);

  // Create member for article creation and login
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.name(),
      email: memberEmail,
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IEconomicDiscussionMember.ICreate,
  });
  typia.assert(member);

  // Authenticate as member
  const authorizedMember = await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password_hash: member.token.refresh,
    } satisfies IEconomicDiscussionMember.ILogin,
  });
  typia.assert(authorizedMember);

  // Create test category for article organization
  const category =
    await api.functional.economicDiscussion.moderator.categories.create(
      connection,
      {
        body: {
          name: "Economic Policy Analysis",
          code: "economic_policy",
          description:
            "Analysis of current economic policies and their impacts",
          display_order: 1,
          is_active: true,
        } satisfies IEconomicDiscussionCategory.ICreate,
      },
    );
  typia.assert(category);

  // Generate maximum content close to the 50,000 character limit
  const maxContentLength = 49900; // Closer to the 50,000 limit

  // Generate structured economic analysis
  const analysisStructure = ArrayUtil.repeat(
    8,
    (index) => `
Section ${index + 1}: Economic Framework Assessment
Through systematic analysis of contemporary economic indicators and policy frameworks, we identify critical success factors and optimization opportunities.

Key Economic Indicators:
${ArrayUtil.repeat(4, (j) => `  • Indicator ${j + 1}: ${RandomGenerator.paragraph({ sentences: 3 })}`).join("\n")}

Policy Implications:
${ArrayUtil.repeat(3, (j) => `  • Implication ${j + 1}: ${RandomGenerator.paragraph({ sentences: 2 })}`).join("\n")}

Key Findings:
${ArrayUtil.repeat(2, (j) => `  • Finding ${j + 1}: ${RandomGenerator.paragraph({ sentences: 3 })}`).join("\n")}

Recommendations:
${ArrayUtil.repeat(3, (j) => `  • Recommendation ${j + 1}: ${RandomGenerator.paragraph({ sentences: 4 })}`).join("\n")}
`,
  );

  let fullContent = `Comprehensive Economic Policy Analysis: Large-Scale Financial and Regulatory Assessment

Executive Summary:
${RandomGenerator.paragraph({ sentences: 4 })}

${analysisStructure.join("\n")}

Conclusion:
${RandomGenerator.content({ paragraphs: 5 })}
`;

  // Adjust to maximize length without exceeding limit
  const contentLength = fullContent.length;
  if (contentLength < maxContentLength) {
    const remaining = maxContentLength - contentLength;
    const fillerContent = RandomGenerator.content({
      paragraphs: Math.floor(remaining / 1200),
      sentenceMin: 20,
      sentenceMax: 35,
      wordMin: 5,
      wordMax: 12,
    });
    fullContent += fillerContent;
  }

  // Trim to ensure exactly at maximum length boundary
  const finalContent = fullContent.slice(0, maxContentLength);

  TestValidator.predicate(
    "article content should be near maximum length",
    finalContent.length >= 49800 && finalContent.length <= 50000,
  );

  // Create article with maximum length content
  const articleData = {
    title: `Comprehensive Economic Policy Analysis: ${RandomGenerator.name(4)}`,
    content: finalContent,
    category_ids: [category.id],
    attachments: [],
  } satisfies IEconomicDiscussionArticle.ICreate;

  const article =
    await api.functional.economicDiscussion.member.articles.create(connection, {
      body: articleData,
    });
  typia.assert(article);

  // Verify article creation success and content integrity
  TestValidator.equals(
    "article title matches input",
    article.title,
    articleData.title,
  );
  TestValidator.equals(
    "article content matches input",
    article.content,
    finalContent,
  );
  TestValidator.equals(
    "article has correct category",
    article.categories.length,
    1,
  );
  TestValidator.equals(
    "article category id matches",
    article.categories[0].id,
    category.id,
  );
  TestValidator.equals(
    "article view count starts at zero",
    article.view_count,
    0,
  );
  TestValidator.predicate(
    "article version starts at minimum value",
    article.version >= 1,
  );
  TestValidator.equals(
    "article status is pending for moderation",
    article.status,
    "pending",
  );

  // Verify timestamps
  TestValidator.predicate(
    "article has creation timestamp",
    article.created_at !== undefined,
  );
  TestValidator.predicate(
    "article has update timestamp",
    article.updated_at !== undefined,
  );
  TestValidator.predicate(
    "creation timestamp is valid ISO",
    !isNaN(Date.parse(article.created_at)),
  );

  TestValidator.predicate(
    "article content respects maximum length boundary",
    article.content.length >= 49800 && article.content.length <= 50000,
  );

  // Validate content structure integrity
  TestValidator.predicate(
    "article maintains comprehensive analysis structure",
    article.content.includes("Executive Summary:") &&
      article.content.includes("Conclusion:") &&
      article.content.includes("Economic Policy Analysis"),
  );

  // Verify content scale handling
  TestValidator.predicate(
    "article demonstrates significant content handling",
    article.content.length > 48000,
  );
}
