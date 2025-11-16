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

export async function test_api_article_retrieval_public_access(
  connection: api.IConnection,
) {
  // Step 1: Create a member account to create the test article
  const memberAuth = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphabets(10).toLowerCase(),
      email: `test_${RandomGenerator.alphabets(6)}@example.com`,
      password: "TestPassword123!",
    } satisfies IEconomicDiscussionMember.ICreate,
  });
  typia.assert(memberAuth);

  // Step 2: Create an article that will be retrieved publicly
  const article =
    await api.functional.economicDiscussion.member.articles.create(connection, {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 5,
          wordMax: 10,
        }),
        content: RandomGenerator.content({
          paragraphs: 3,
          sentenceMin: 10,
          sentenceMax: 15,
        }),
        category_ids: ArrayUtil.repeat(2, () =>
          typia.random<string & tags.Format<"uuid">>(),
        ),
      } satisfies IEconomicDiscussionArticle.ICreate,
    });
  typia.assert(article);

  // Step 3: Create an unauthenticated connection for public access
  const publicConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // Step 4: Retrieve the article without authentication
  const retrievedArticle = await api.functional.economicDiscussion.articles.at(
    publicConnection,
    {
      articleId: article.id,
    },
  );

  // Step 5: Validate the retrieved article
  typia.assert(retrievedArticle);

  // Step 6: Verify article data matches expectations
  TestValidator.equals("article id matches", retrievedArticle.id, article.id);
  TestValidator.equals(
    "article title matches",
    retrievedArticle.title,
    article.title,
  );
  TestValidator.equals(
    "article content matches",
    retrievedArticle.content,
    article.content,
  );
  TestValidator.equals(
    "article has categories",
    retrievedArticle.categories.length,
    2,
  );
  TestValidator.equals(
    "article has correct status",
    retrievedArticle.status,
    article.status,
  );

  // Step 7: Verify public fields are present
  TestValidator.predicate(
    "article has view count",
    retrievedArticle.view_count >= 0,
  );
  TestValidator.predicate("article has version", retrievedArticle.version >= 1);
  TestValidator.predicate(
    "article has creation timestamp",
    typeof retrievedArticle.created_at === "string",
  );
  TestValidator.predicate(
    "article has update timestamp",
    typeof retrievedArticle.updated_at === "string",
  );

  // Step 8: Verify author information is available (either member or moderator)
  const hasMemberAuthor = retrievedArticle.member_author_profile !== undefined;
  const hasModeratorAuthor =
    retrievedArticle.moderator_author_profile !== undefined;
  TestValidator.predicate(
    "article has author information",
    hasMemberAuthor || hasModeratorAuthor,
  );
}
