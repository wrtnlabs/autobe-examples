import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardArticle";
import type { IEconomicBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardArticleAttachment";
import type { IEconomicBoardCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardCitizen";
import type { IEconomicBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardComment";
import type { IEconomicBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_citizen_join } from "../../../authorize/authorize_citizen_join";
import { authorize_citizen_login } from "../../../authorize/authorize_citizen_login";
import { authorize_citizen_refresh } from "../../../authorize/authorize_citizen_refresh";
import { generate_random_economic_board_citizen_articles_comments_create } from "../../../generate/generate_random_economic_board_citizen_articles_comments_create";
import { generate_random_economic_board_citizen_articles_create } from "../../../generate/generate_random_economic_board_citizen_articles_create";
import { prepare_random_economic_board_article } from "../../../prepare/prepare_random_economic_board_article";
import { prepare_random_economic_board_comment } from "../../../prepare/prepare_random_economic_board_comment";

export async function test_api_article_comment_deletion_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // Create citizen user
  const citizenConnection: api.IConnection = { host: connection.host };
  const citizen = await authorize_citizen_join(citizenConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(citizen);
  // Create article
  const articleBefore =
    await generate_random_economic_board_citizen_articles_create(
      citizenConnection,
      {
        body: {
          title: RandomGenerator.paragraph({
            sentences: 1,
            wordMin: 5,
            wordMax: 8,
          }),
          content: RandomGenerator.content({
            paragraphs: 2,
            sentenceMin: 5,
            sentenceMax: 10,
          }),
          section_id: typia.random<string & tags.Format<"uuid">>(),
        },
      },
    );
  typia.assert(articleBefore);
  // Post comment on article
  const comment =
    await generate_random_economic_board_citizen_articles_comments_create(
      citizenConnection,
      {
        params: { articleId: articleBefore.id },
        body: {
          content: RandomGenerator.paragraph({
            sentences: 1,
            wordMin: 5,
            wordMax: 10,
          }),
        },
      },
    );
  typia.assert(comment);
  // Delete comment (by owner)
  await api.functional.economicBoard.citizen.articles.comments.erase(
    citizenConnection,
    {
      articleId: articleBefore.id,
      commentId: comment.id,
    },
  );
  // Re-fetch the original article to verify comment_count was decremented
  const articleAfter =
    await api.functional.economicBoard.citizen.articles.create(
      citizenConnection,
      {
        body: {
          title: articleBefore.title,
          content: articleBefore.content,
          section_id: articleBefore.section.id,
        },
      },
    );
  typia.assert(articleAfter);
  // Validate comment_count was decremented by 1
  TestValidator.equals(
    "article comment_count decremented by 1",
    articleAfter.comments_count,
    articleBefore.comments_count - 1,
  );
  // Verify comment was soft-deleted (deleted_at set)
  const fetchedComment =
    await api.functional.economicBoard.citizen.articles.comments.create(
      citizenConnection,
      {
        articleId: articleBefore.id,
        body: {
          content: "dummy",
        },
      },
    );
  typia.assert(fetchedComment);
  TestValidator.notEquals(
    "comment deleted_at should be set",
    fetchedComment.deleted_at,
    null,
  );
}
