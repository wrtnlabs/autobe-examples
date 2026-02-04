import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionAdministrator";
import type { IEconomicDiscussionArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionArticle";
import type { IEconomicDiscussionArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionArticleTag";
import type { IEconomicDiscussionCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionCitizen";
import type { IEconomicDiscussionComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionComment";
import type { IEconomicDiscussionSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicDiscussionComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicDiscussionComment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_citizen_join } from "../../../authorize/authorize_citizen_join";
import { authorize_citizen_login } from "../../../authorize/authorize_citizen_login";
import { authorize_citizen_refresh } from "../../../authorize/authorize_citizen_refresh";
import { generate_random_economic_discussion_administrator_sections_create } from "../../../generate/generate_random_economic_discussion_administrator_sections_create";
import { generate_random_economic_discussion_citizen_articles_comments_create } from "../../../generate/generate_random_economic_discussion_citizen_articles_comments_create";
import { generate_random_economic_discussion_citizen_articles_create } from "../../../generate/generate_random_economic_discussion_citizen_articles_create";
import { prepare_random_economic_discussion_article } from "../../../prepare/prepare_random_economic_discussion_article";
import { prepare_random_economic_discussion_comment } from "../../../prepare/prepare_random_economic_discussion_comment";
import { prepare_random_economic_discussion_section } from "../../../prepare/prepare_random_economic_discussion_section";

export async function test_api_article_comments_retrieval_by_other_user(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create first citizen account (article author)
  const authorConnection: api.IConnection = { host: connection.host };
  const author: IEconomicDiscussionCitizen.IAuthorized =
    await authorize_citizen_join(authorConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://example.com/join",
        referrer: "https://example.com/home",
      },
    });
  // Step 2: Create administrator account for section creation
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: IEconomicDiscussionAdministrator.IAuthorized =
    await authorize_administrator_join(adminConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://example.com/admin/join",
        referrer: "https://example.com/admin",
      },
    });
  // Step 3: Create a section for the article
  const section: IEconomicDiscussionSection =
    await generate_random_economic_discussion_administrator_sections_create(
      adminConnection,
      {},
    );
  // Step 4: Create an article by the first citizen in the created section
  const article: IEconomicDiscussionArticle =
    await generate_random_economic_discussion_citizen_articles_create(
      authorConnection,
      {
        body: {
          section_id: section.id,
          title: RandomGenerator.paragraph({ sentences: 2 }),
          content: RandomGenerator.content({ paragraphs: 2 }),
        },
      },
    );
  // Step 5: Post multiple comments on the article by the author
  const commentCount = 3;
  const comments: IEconomicDiscussionComment[] = [];
  for (let i = 0; i < commentCount; i++) {
    const comment: IEconomicDiscussionComment =
      await generate_random_economic_discussion_citizen_articles_comments_create(
        authorConnection,
        {
          body: {
            content: RandomGenerator.paragraph({ sentences: 2 }),
          },
          params: {
            articleId: article.id,
          },
        },
      );
    comments.push(comment);
  }
  // Step 6: Create second citizen account (comment viewer)
  const viewerConnection: api.IConnection = { host: connection.host };
  const viewer: IEconomicDiscussionCitizen.IAuthorized =
    await authorize_citizen_join(viewerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://example.com/join",
        referrer: "https://example.com/home",
      },
    });
  // Step 7: Retrieve comments on the article using the second citizen's connection
  const retrievedComments: IPageIEconomicDiscussionComment.ISummary =
    await api.functional.economicDiscussion.citizen.articles.comments.getByArticleid(
      viewerConnection,
      {
        articleId: article.id,
      },
    );
  // Step 8: Validate retrieved comments
  typia.assert(retrievedComments);
  // Validate pagination metadata
  TestValidator.equals(
    "pagination records match comment count",
    retrievedComments.pagination.records,
    commentCount,
  );
  TestValidator.equals(
    "pagination limit is sufficient",
    retrievedComments.pagination.limit >= commentCount,
    true,
  );
  TestValidator.equals(
    "pagination current page is 1",
    retrievedComments.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination pages is 1 or more",
    retrievedComments.pagination.pages >= 1,
    true,
  );
  // Validate comment data and integrity
  TestValidator.equals(
    "number of comments retrieved matches expectation",
    retrievedComments.data.length,
    commentCount,
  );
  // Validate each comment's content and author identity
  for (let i = 0; i < commentCount; i++) {
    const retrievedComment = retrievedComments.data[i];
    const originalComment = comments[i];
    // Validate content matches
    TestValidator.equals(
      "comment content matches",
      retrievedComment.content,
      originalComment.content,
    );
    // Validate timestamp matches (ISO 8601)
    TestValidator.equals(
      "comment creation time is in valid ISO format",
      new Date(retrievedComment.createdAt).toISOString(),
      retrievedComment.createdAt,
    );
    // Validate author summary exists and has ID
    TestValidator.predicate(
      "comment has a valid author",
      retrievedComment.author !== null,
    );
    TestValidator.equals(
      "comment has valid author ID",
      retrievedComment.author?.id !== undefined,
      true,
    );
  }
}