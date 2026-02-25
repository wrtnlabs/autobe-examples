import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_user_articles_create } from "../../../generate/generate_random_discussion_board_user_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";

export async function test_api_article_update_normal_workflow(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate user
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(user);
  // 2. Create initial article
  const initialArticle =
    await generate_random_discussion_board_user_articles_create(
      userConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          content: RandomGenerator.content({ paragraphs: 3 }),
          discussion_board_section_id: typia.random<
            string & tags.Format<"uuid">
          >(),
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(initialArticle);
  // 3. Update article with new title and content
  const updateData = {
    title: RandomGenerator.paragraph({ sentences: 2 }),
    content: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies IDiscussionBoardArticle.IUpdate;
  const updatedArticle =
    await api.functional.discussionBoard.user.articles.update(userConnection, {
      articleId: initialArticle.id,
      body: updateData,
    });
  typia.assert(updatedArticle);
  // 4. Validate the update
  TestValidator.equals("title updated", updatedArticle.title, updateData.title);
  TestValidator.equals(
    "content updated",
    updatedArticle.content,
    updateData.content,
  );
  TestValidator.equals("author preserved", updatedArticle.author.id, user.id);
  TestValidator.equals(
    "section preserved",
    updatedArticle.section.id,
    initialArticle.section.id,
  );
  TestValidator.predicate(
    "updated_at changed",
    updatedArticle.updated_at !== initialArticle.updated_at,
  );
}
