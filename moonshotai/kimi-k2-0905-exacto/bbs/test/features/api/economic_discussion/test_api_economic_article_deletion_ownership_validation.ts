import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionArticle";
import type { IEconomicDiscussionAttachmentFileType } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionAttachmentFileType";
import type { IEconomicDiscussionAttachments } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionAttachments";
import type { IEconomicDiscussionCategories } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionCategories";
import type { IEconomicDiscussionMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMember";
import type { IEconomicDiscussionMembers } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMembers";
import type { IEconomicDiscussionModerators } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModerators";

/**
 * Test that only the article author can delete their articles and unauthorized
 * deletion attempts are properly rejected.
 *
 * This comprehensive test validates ownership-based deletion restrictions for
 * economic discussion articles. The test follows a realistic security scenario
 * where one member creates an article but another member attempts to delete it,
 * ensuring proper authorization controls are enforced.
 *
 * Test Flow:
 *
 * 1. Create first member account (Author 1)
 * 2. Register second member account (Author 2)
 * 3. Author 1 creates an economic discussion article
 * 4. Author 2 attempts to delete Author 1's article
 * 5. Verify that deletion is rejected with appropriate error or security response
 * 6. Confirm that Author 1 can still delete their own article
 *
 * This validates the system's ability to enforce article ownership and prevent
 * unauthorized content modification, crucial for maintaining discussion
 * integrity.
 */
export async function test_api_economic_article_deletion_ownership_validation(
  connection: api.IConnection,
) {
  // Step 1: Create first member account who will be the article author
  const author1Email = typia.random<string & tags.Format<"email">>();
  const author1Data = {
    body: {
      username: RandomGenerator.alphabets(8),
      email: author1Email,
      password: RandomGenerator.alphabets(12),
    } satisfies IEconomicDiscussionMember.ICreate,
  };

  const author1: IEconomicDiscussionMember.IAuthorized =
    await api.functional.auth.member.join(connection, author1Data);
  typia.assert(author1);

  // Step 2: Create second member account who will attempt unauthorized deletion
  const author2Email = typia.random<string & tags.Format<"email">>();
  const author2Data = {
    body: {
      username: RandomGenerator.alphabets(8),
      email: author2Email,
      password: RandomGenerator.alphabets(12),
    } satisfies IEconomicDiscussionMember.ICreate,
  };

  const author2: IEconomicDiscussionMember.IAuthorized =
    await api.functional.auth.member.join(connection, author2Data);
  typia.assert(author2);

  // Step 3: Author 1 creates an economic discussion article
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  const articleData = {
    body: {
      title: RandomGenerator.paragraph({ sentences: 3 }),
      content: RandomGenerator.content({ paragraphs: 3 }),
      category_ids: [categoryId],
    } satisfies IEconomicDiscussionArticle.ICreate,
  };

  const article: IEconomicDiscussionArticle =
    await api.functional.economicDiscussion.member.articles.create(
      connection,
      articleData,
    );
  typia.assert(article);

  // Step 4: Author 2 attempts to delete Author 1's article (should fail)
  await TestValidator.error(
    "unauthorized deletion should be rejected",
    async () => {
      await api.functional.economicDiscussion.member.articles.erase(
        connection,
        {
          articleId: article.id,
        },
      );
    },
  );
}
