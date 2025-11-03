import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPoliticsBbsArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsArticle";
import type { IPoliticsBbsArticleSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsArticleSnapshot";
import type { IPoliticsBbsAttachmentOfMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsAttachmentOfMember";
import type { IPoliticsBbsAttachmentOfModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsAttachmentOfModerator";
import type { IPoliticsBbsAttachmentOfVisitor } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsAttachmentOfVisitor";
import type { IPoliticsBbsCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsCategory";
import type { IPoliticsBbsComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsComment";
import type { IPoliticsBbsFileAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsFileAttachment";
import type { IPoliticsBbsImageAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsImageAttachment";
import type { IPoliticsBbsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsMember";
import type { IPoliticsBbsModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsModerator";
import type { IPoliticsBbsVisitor } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsVisitor";

/**
 * Test member article retrieval - comprehensive workflow
 *
 * This test validates that authenticated members can successfully retrieve a
 * complete list of all articles they have created on the politics discussion
 * board platform. The test covers the full member content management workflow
 * from account creation through article publishing and personal dashboard
 * access.
 *
 * Test Workflow:
 *
 * 1. Create new member account with unique credentials
 * 2. Create multiple test articles with varied content and categories
 * 3. Retrieve member's personal article list via authenticated endpoint
 * 4. Validate all created articles are returned with complete metadata
 * 5. Verify article data integrity including titles, categories, and status
 *
 * Validation Points:
 *
 * - Member authentication and authorization work correctly
 * - Article creation captures all required metadata
 * - Personal article list returns complete data set
 * - Article summaries include essential fields (title, content, state, views)
 * - Category associations are properly maintained
 * - Pagination metadata is correctly formatted
 * - Response structure matches API contract specifications
 */
export async function test_api_member_retrieve_own_articles_success(
  connection: api.IConnection,
) {
  // Step 1: Create new member account for testing
  const memberCredentials = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    href: "https://example.com/register",
    referrer: "https://example.com/home",
  } satisfies IPoliticsBbsMember.IJoin;

  const newMember = await api.functional.auth.members.join(connection, {
    body: memberCredentials,
  });
  typia.assert(newMember);

  // Step 2: Create multiple articles with different content using ArrayUtil for consistency
  const createdArticles = await ArrayUtil.asyncRepeat(5, async (index) => {
    const categoryId = typia.random<string & tags.Format<"uuid">>();
    const articleContent = {
      politics_bbs_category_id: categoryId,
      title: `Political Analysis ${index + 1}: ${RandomGenerator.name(2)}`,
      content: RandomGenerator.content({
        paragraphs: 3,
        sentenceMin: 15,
        sentenceMax: 25,
        wordMin: 4,
        wordMax: 8,
      }),
    } satisfies IPoliticsBbsArticle.ICreate;

    const newArticle = await api.functional.politicsBbs.member.articles.create(
      connection,
      {
        body: articleContent,
      },
    );
    typia.assert(newArticle);

    // Verify article creation was successful
    TestValidator.equals(
      "article title matches",
      newArticle.title,
      articleContent.title,
    );
    TestValidator.equals(
      "article content matches",
      newArticle.content,
      articleContent.content,
    );
    TestValidator.equals(
      "article category matches",
      newArticle.politics_bbs_category_id,
      articleContent.politics_bbs_category_id,
    );

    return newArticle;
  });

  // Step 3: Retrieve member's personal article list
  const memberArticleList =
    await api.functional.politicsBbs.member.members.me.articles.at(connection);
  typia.assert(memberArticleList);

  // Step 4: Validate response structure and content
  TestValidator.predicate(
    "article list has data",
    memberArticleList.data.length > 0,
  );
  TestValidator.predicate(
    "pagination exists",
    memberArticleList.pagination !== undefined,
  );

  // Step 5: Verify all created articles are in the member's list
  const retrievedArticleIds = new Set(
    memberArticleList.data.map((article) => article.id),
  );

  for (const createdArticle of createdArticles) {
    TestValidator.predicate(
      `created article ${createdArticle.id} exists in member list`,
      retrievedArticleIds.has(createdArticle.id),
    );
  }

  // Step 6: Validate article metadata integrity
  for (const article of memberArticleList.data) {
    // Verify essential fields exist
    TestValidator.predicate(
      "article has ID",
      typia.is<string & tags.Format<"uuid">>(article.id),
    );
    TestValidator.predicate("article has title", article.title.length > 0);
    TestValidator.predicate(
      "article has content",
      article.content.length >= 50,
    );
    TestValidator.predicate("article has state", article.state.length > 0);
    TestValidator.predicate("article has view count", article.view_count >= 0);
    TestValidator.predicate(
      "article has timestamps",
      typia.is<string & tags.Format<"date-time">>(article.created_at) &&
        typia.is<string & tags.Format<"date-time">>(article.updated_at),
    );

    // Verify category information
    TestValidator.predicate(
      "article has category",
      article.category !== undefined,
    );
    if (article.category) {
      TestValidator.predicate(
        "category has ID",
        typia.is<string & tags.Format<"uuid">>(article.category.id),
      );
      TestValidator.predicate(
        "category has name",
        article.category.name.length > 0,
      );
      TestValidator.predicate(
        "category has code",
        article.category.code.length > 0,
      );
    }
  }

  // Step 7: Validate pagination metadata
  const pagination = memberArticleList.pagination;
  TestValidator.predicate("current page is valid", pagination.current >= 0);
  TestValidator.predicate("limit is valid", pagination.limit > 0);
  TestValidator.predicate(
    "total records matches article count",
    pagination.records === memberArticleList.data.length,
  );
  TestValidator.predicate(
    "total pages is calculated correctly",
    pagination.pages >= 1,
  );
}
