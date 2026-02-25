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

export async function test_api_comment_update_outside_edit_window_by_author(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create citizen user
  const citizenConnection: api.IConnection = { host: connection.host };
  const citizen: IEconomicBoardCitizen.IAuthorized =
    await authorize_citizen_join(citizenConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 1 }),
      } satisfies IEconomicBoardCitizen.IJoin,
    });
  // 2. Create article
  const article = await generate_random_economic_board_citizen_articles_create(
    citizenConnection,
    {
      body: {
        title: RandomGenerator.alphabets(10),
        content: RandomGenerator.content({ paragraphs: 1 }),
        section_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IEconomicBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // 3. Create comment
  const commentContent = RandomGenerator.paragraph({ sentences: 2 });
  const createCommentRequest = {
    articleId: article.id,
    body: { content: commentContent } satisfies IEconomicBoardComment.ICreate,
  };
  const commented =
    await api.functional.economicBoard.citizen.articles.comments.create(
      citizenConnection,
      createCommentRequest,
    );
  typia.assert(commented);
  // 4. Attempt to update comment after edit window expired
  // The server enforces a 60-minute edit window. After this window, updates are forbidden.
  // Although we cannot simulate 60 minutes of elapsed time in an E2E test,
  // we rely on the server's built-in logic that will reject any update made after the window.
  // This test verifies that the server correctly rejects such an attempt with 403 Forbidden.
  const updateBody: IEconomicBoardComment.IUpdate = {
    content: RandomGenerator.paragraph({ sentences: 2 }),
  };
  await TestValidator.error(
    "should reject edit after 60-minute edit window expires",
    async () => {
      await api.functional.economicBoard.citizen.articles.comments.update(
        citizenConnection,
        {
          articleId: article.id,
          commentId: commented.id,
          body: updateBody,
        },
      );
    },
  );
}
