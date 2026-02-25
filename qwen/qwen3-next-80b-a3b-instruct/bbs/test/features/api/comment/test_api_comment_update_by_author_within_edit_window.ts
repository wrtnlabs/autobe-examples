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

export async function test_api_comment_update_by_author_within_edit_window(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create citizen user
  const citizenConnection: api.IConnection = { host: connection.host };
  const citizen = await authorize_citizen_join(citizenConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: null,
    } satisfies IEconomicBoardCitizen.IJoin,
  });
  typia.assert(citizen);
  // 2. Create article for the comment
  const article = await generate_random_economic_board_citizen_articles_create(
    citizenConnection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 3,
          wordMax: 8,
        }),
        content: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 3,
          sentenceMax: 6,
        }),
        section_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IEconomicBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // 3. Create comment on the article
  const comment =
    await generate_random_economic_board_citizen_articles_comments_create(
      citizenConnection,
      {
        params: { articleId: article.id },
        body: {
          content:
            "Original comment content" satisfies IEconomicBoardComment.ICreate["content"],
        },
      },
    );
  typia.assert(comment);
  // Capture original timestamps for comparison
  const originalCreatedAt = new Date(comment.created_at);
  const originalUpdatedAt = new Date(comment.updated_at).toISOString();
  // 4. Wait 40 seconds to ensure we're within the 60-minute edit window, but past creation time
  const fortySecondsLater = new Date(originalCreatedAt.getTime() + 40000);
  // 5. Update comment with whitespace to verify trimming
  const updatedComment =
    await api.functional.economicBoard.citizen.comments.update(
      citizenConnection,
      {
        commentId: comment.id,
        body: {
          content:
            "  Updated comment content with extra whitespace  " satisfies IEconomicBoardComment.IUpdate["content"],
        },
      },
    );
  typia.assert(updatedComment);
  // 6. Validate update: content trimmed, updated_at advanced, author and article unchanged
  TestValidator.equals(
    "content trimmed correctly",
    updatedComment.content,
    "Updated comment content with extra whitespace",
  );
  TestValidator.predicate(
    "updated_at progressed beyond creation",
    () => new Date(updatedComment.updated_at) > fortySecondsLater,
  );
  TestValidator.equals(
    "author unchanged",
    updatedComment.author.id,
    comment.author.id,
  );
  TestValidator.equals(
    "article unchanged",
    updatedComment.article.id,
    article.id,
  );
  TestValidator.notEquals(
    "updated_at was updated",
    updatedComment.updated_at,
    originalUpdatedAt,
  );
}