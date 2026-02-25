import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardAdministrator";
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

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_citizen_join } from "../../../authorize/authorize_citizen_join";
import { authorize_citizen_login } from "../../../authorize/authorize_citizen_login";
import { authorize_citizen_refresh } from "../../../authorize/authorize_citizen_refresh";
import { generate_random_economic_board_citizen_articles_comments_create } from "../../../generate/generate_random_economic_board_citizen_articles_comments_create";
import { generate_random_economic_board_citizen_articles_create } from "../../../generate/generate_random_economic_board_citizen_articles_create";
import { prepare_random_economic_board_article } from "../../../prepare/prepare_random_economic_board_article";
import { prepare_random_economic_board_comment } from "../../../prepare/prepare_random_economic_board_comment";

export async function test_api_comment_update_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create citizen user and authenticate
  const citizenConnection: api.IConnection = { host: connection.host };
  const citizen = await authorize_citizen_join(citizenConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 1 }),
    },
  });
  typia.assert(citizen);
  // 2. Create a section for the article
  const section = typia.random<IEconomicBoardSection.ISummary>();
  // 3. Create an article as citizen
  const article = await generate_random_economic_board_citizen_articles_create(
    citizenConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({ paragraphs: 3 }),
        section_id: section.id,
      },
    },
  );
  typia.assert(article);
  // 4. Create a comment as citizen
  const comment =
    await generate_random_economic_board_citizen_articles_comments_create(
      citizenConnection,
      {
        params: { articleId: article.id },
        body: { content: RandomGenerator.paragraph({ sentences: 2 }) },
      },
    );
  typia.assert(comment);
  // 5. Create administrator user and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(admin);
  // 6. Update the comment as administrator (bypassing the 60-minute edit window)
  const newContent = RandomGenerator.paragraph({ sentences: 3 });
  const updatedComment =
    await api.functional.economicBoard.citizen.articles.comments.update(
      adminConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: { content: newContent } satisfies IEconomicBoardComment.IUpdate,
      },
    );
  typia.assert(updatedComment);
  // 7. Validate the update
  TestValidator.equals(
    "comment content updated",
    updatedComment.content,
    newContent,
  );
  TestValidator.predicate(
    "updated_at refreshed",
    updatedComment.updated_at > comment.updated_at,
  );
  TestValidator.equals(
    "comment owner unchanged",
    updatedComment.author.id,
    comment.author.id,
  );
  TestValidator.equals(
    "article reference unchanged",
    updatedComment.article.id,
    article.id,
  );
  TestValidator.equals("comment id unchanged", updatedComment.id, comment.id);
  TestValidator.predicate(
    "comment not deleted",
    updatedComment.deleted_at === null,
  );
}
