import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachment";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";
import type { IDiscussionBoardContributor } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContributor";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

export async function test_api_article_retrieval_draft_by_author(
  connection: api.IConnection,
) {
  // 1. First contributor joins and creates a draft article
  const author = await api.functional.auth.contributor.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<50> &
          tags.Pattern<"^[a-zA-Z0-9_]+$">
      >(),
      password: "SecurePass123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardContributor.ICreate,
  });
  typia.assert(author);
  TestValidator.equals(
    "author is authenticated",
    author.account_status,
    "active",
  );

  // 2. Create a draft article with valid category ID
  const draftArticle =
    await api.functional.discussionBoard.contributor.articles.create(
      connection,
      {
        body: {
          title: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 2,
            wordMax: 4,
          }),
          content: RandomGenerator.content({
            paragraphs: 2,
            sentenceMin: 5,
            sentenceMax: 10,
            wordMin: 3,
            wordMax: 8,
          }),
          categoryId: typia.random<string & tags.Format<"uuid">>(),
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(draftArticle);
  TestValidator.equals("article status is draft", draftArticle.status, "draft");
  TestValidator.equals(
    "article author matches",
    draftArticle.author.id,
    author.id,
  );

  // 3. Author retrieves their own draft article
  const retrievedArticle = await api.functional.discussionBoard.articles.at(
    connection,
    {
      articleId: draftArticle.id,
    },
  );
  typia.assert(retrievedArticle);
  TestValidator.equals(
    "retrieved article matches created article",
    retrievedArticle.id,
    draftArticle.id,
  );
  TestValidator.equals(
    "retrieved article status is still draft",
    retrievedArticle.status,
    "draft",
  );
  TestValidator.equals(
    "retrieved article title matches",
    retrievedArticle.title,
    draftArticle.title,
  );
  TestValidator.equals(
    "retrieved article content matches",
    retrievedArticle.content,
    draftArticle.content,
  );
  TestValidator.equals(
    "retrieved article author matches",
    retrievedArticle.author.id,
    draftArticle.author.id,
  );

  // 4. Create second contributor and verify they cannot access first author's draft article
  const otherContributor = await api.functional.auth.contributor.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<50> &
            tags.Pattern<"^[a-zA-Z0-9_]+$">
        >(),
        password: "SecurePass123!",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardContributor.ICreate,
    },
  );
  typia.assert(otherContributor);

  // 5. Verify other contributor cannot access draft article
  await TestValidator.error(
    "other contributor cannot access draft article",
    async () => {
      await api.functional.discussionBoard.articles.at(connection, {
        articleId: draftArticle.id,
      });
    },
  );
}
