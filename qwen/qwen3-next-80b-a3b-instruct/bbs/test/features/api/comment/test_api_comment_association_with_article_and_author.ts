import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionArticle";
import type { IEconomicDiscussionArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionArticleTag";
import type { IEconomicDiscussionCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionCitizen";
import type { IEconomicDiscussionComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionComment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_citizen_join } from "../../../authorize/authorize_citizen_join";
import { authorize_citizen_login } from "../../../authorize/authorize_citizen_login";
import { authorize_citizen_refresh } from "../../../authorize/authorize_citizen_refresh";
import { generate_random_economic_discussion_citizen_articles_comments_create } from "../../../generate/generate_random_economic_discussion_citizen_articles_comments_create";
import { generate_random_economic_discussion_citizen_articles_create } from "../../../generate/generate_random_economic_discussion_citizen_articles_create";
import { prepare_random_economic_discussion_article } from "../../../prepare/prepare_random_economic_discussion_article";
import { prepare_random_economic_discussion_comment } from "../../../prepare/prepare_random_economic_discussion_comment";

export async function test_api_comment_association_with_article_and_author(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create citizen account with random credentials
  const citizenConnection: api.IConnection = { host: connection.host };
  const citizen: IEconomicDiscussionCitizen.IAuthorized =
    await authorize_citizen_join(citizenConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEconomicDiscussionCitizen.IJoin,
    });
  typia.assert(citizen);
  // Step 2: Create article using the authenticated citizen connection
  const article =
    await generate_random_economic_discussion_citizen_articles_create(
      citizenConnection,
      {
        body: {
          title: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 5,
            wordMax: 10,
          }),
          content: RandomGenerator.content({ paragraphs: 2 }),
        } satisfies IEconomicDiscussionArticle.ICreate,
      },
    );
  typia.assert(article);
  // Step 3: Create comment on the article using citizen connection
  const comment =
    await generate_random_economic_discussion_citizen_articles_comments_create(
      citizenConnection,
      {
        params: { articleId: article.id },
        body: {
          content: RandomGenerator.paragraph({
            sentences: 1,
            wordMin: 10,
            wordMax: 30,
          }),
        } satisfies IEconomicDiscussionComment.ICreate,
      },
    );
  typia.assert(comment); // Validate the entire comment object
  // Step 4: Verify comment association with correct citizen_id as defined in DTO
  TestValidator.equals(
    "comment author_id matches citizen ID",
    comment.economic_discussion_citizen_id,
    citizen.id,
  );
  // Step 5: Verify comment properties match expected format
  TestValidator.predicate(
    "comment has valid content",
    comment.content!.length >= 1 && comment.content!.length <= 5000,
  );
  TestValidator.predicate(
    "comment has valid timestamp",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z$/.test(
      comment.postedTime,
    ),
  );
}
