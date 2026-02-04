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

export async function test_api_article_comments_retrieval_with_max_count_limit(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create administrator connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEconomicDiscussionAdministrator.IJoin,
  });
  // Step 2: Create a section for the article
  const section =
    await generate_random_economic_discussion_administrator_sections_create(
      adminConnection,
      {},
    );
  // Step 3: Create citizen connection and authenticate
  const citizenConnection: api.IConnection = { host: connection.host };
  await authorize_citizen_join(citizenConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEconomicDiscussionCitizen.IJoin,
  });
  // Step 4: Create an article in the created section
  const article =
    await generate_random_economic_discussion_citizen_articles_create(
      citizenConnection,
      {
        body: {
          section_id: section.id,
        } satisfies IEconomicDiscussionArticle.ICreate,
      },
    );
  // Step 5: Post exactly 1000 comments on the article to reach the limit
  const commentPromises: Promise<IEconomicDiscussionComment>[] = [];
  for (let i = 0; i < 1000; i++) {
    commentPromises.push(
      generate_random_economic_discussion_citizen_articles_comments_create(
        citizenConnection,
        {
          params: { articleId: article.id },
          body: {
            content: RandomGenerator.paragraph({
              sentences: 3,
              wordMin: 5,
              wordMax: 10,
            }),
          } satisfies IEconomicDiscussionComment.ICreate,
        },
      ),
    );
  }
  await Promise.all(commentPromises);
  // Step 6: Retrieve comments from the article with 1000 comments
  const commentsWithLimit =
    await api.functional.economicDiscussion.citizen.articles.comments.getByArticleid(
      citizenConnection,
      {
        articleId: article.id,
      },
    );
  typia.assert(commentsWithLimit);
  // Validate that exactly 1000 comments were returned
  TestValidator.equals(
    "comment count matches limit",
    commentsWithLimit.pagination.records,
    1000,
  );
  TestValidator.equals(
    "returned comments list length",
    commentsWithLimit.data.length,
    1000,
  );
  // Step 7: Create a second article
  const secondArticle =
    await generate_random_economic_discussion_citizen_articles_create(
      citizenConnection,
      {
        body: {
          section_id: section.id,
        } satisfies IEconomicDiscussionArticle.ICreate,
      },
    );
  // Step 8: Post 1001 comments on the second article (exceeds limit)
  const secondCommentPromises: Promise<IEconomicDiscussionComment>[] = [];
  for (let i = 0; i < 1001; i++) {
    secondCommentPromises.push(
      generate_random_economic_discussion_citizen_articles_comments_create(
        citizenConnection,
        {
          params: { articleId: secondArticle.id },
          body: {
            content: RandomGenerator.paragraph({
              sentences: 3,
              wordMin: 5,
              wordMax: 10,
            }),
          } satisfies IEconomicDiscussionComment.ICreate,
        },
      ),
    );
  }
  await Promise.all(secondCommentPromises);
  // Step 9: Retrieve comments from the second article with 1001 comments
  const commentsWithExcess =
    await api.functional.economicDiscussion.citizen.articles.comments.getByArticleid(
      citizenConnection,
      {
        articleId: secondArticle.id,
      },
    );
  typia.assert(commentsWithExcess);
  // Validate that only 1000 comments were returned (oldest 1000)
  TestValidator.equals(
    "comment count for excess is capped",
    commentsWithExcess.pagination.records,
    1001,
  );
  TestValidator.equals(
    "returned comments list length for excess",
    commentsWithExcess.data.length,
    1000,
  );
  // Validate that the total count reflects the actual number of comments
  TestValidator.notEquals(
    "total comment count reflects actual count",
    commentsWithExcess.pagination.records,
    1000,
  );
}
