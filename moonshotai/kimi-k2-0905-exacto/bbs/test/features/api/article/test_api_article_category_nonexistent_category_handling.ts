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
 * Test proper error handling when attempting to associate a non-existent
 * category with an existing article. This validates referential integrity
 * enforcement and error handling consistency.
 *
 * 1. Create a member account for authentication
 * 2. Create a valid article to test category association
 * 3. Attempt to attach a non-existent category to the article
 * 4. Validate that the system properly rejects the invalid association
 */
export async function test_api_article_category_nonexistent_category_handling(
  connection: api.IConnection,
) {
  // Step 1: Create member account for authentication
  const memberData = {
    username: RandomGenerator.name(),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
  } satisfies IEconomicDiscussionMember.ICreate;

  const member = await api.functional.auth.member.join(connection, {
    body: memberData,
  });
  typia.assert(member);

  // Step 2: Create a valid article for testing
  const articleData = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    content: RandomGenerator.content({ paragraphs: 2 }),
    category_ids: [typia.random<string & tags.Format<"uuid">>()],
  } satisfies IEconomicDiscussionArticle.ICreate;

  const article =
    await api.functional.economicDiscussion.member.articles.create(connection, {
      body: articleData,
    });
  typia.assert(article);

  // Step 3: Attempt to attach a non-existent category
  const nonExistentCategoryCode = "NONEXISTENT_CATEGORY";

  await TestValidator.error(
    "should reject non-existent category attachment",
    async () => {
      await api.functional.economicDiscussion.member.articles.categories.attachCategory(
        connection,
        {
          articleId: article.id,
          categoryCode: nonExistentCategoryCode,
        },
      );
    },
  );
}
