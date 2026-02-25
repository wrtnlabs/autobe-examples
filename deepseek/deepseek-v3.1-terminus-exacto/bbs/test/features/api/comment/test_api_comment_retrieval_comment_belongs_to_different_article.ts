import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
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
import { generate_random_discussion_board_user_articles_comments_create } from "../../../generate/generate_random_discussion_board_user_articles_comments_create";
import { generate_random_discussion_board_user_articles_create } from "../../../generate/generate_random_discussion_board_user_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_comment } from "../../../prepare/prepare_random_discussion_board_comment";

export async function test_api_comment_retrieval_comment_belongs_to_different_article(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection for content creation
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(user);
  userConnection.headers = {
    ...userConnection.headers,
    Authorization: user.token.access,
  };
  // Create a valid section ID for article creation (using a randomly generated UUID)
  const sectionId = typia.random<string & tags.Format<"uuid">>();
  // Create first article
  const firstArticle =
    await generate_random_discussion_board_user_articles_create(
      userConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          content: RandomGenerator.content({ paragraphs: 1 }),
          discussion_board_section_id: sectionId,
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(firstArticle);
  // Create second article with same section
  const secondArticle =
    await generate_random_discussion_board_user_articles_create(
      userConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          content: RandomGenerator.content({ paragraphs: 1 }),
          discussion_board_section_id: sectionId,
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(secondArticle);
  // Create comment under second article
  const comment =
    await generate_random_discussion_board_user_articles_comments_create(
      userConnection,
      {
        params: { articleId: secondArticle.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(comment);
  // Attempt to retrieve the comment using first article's ID - should fail with 404
  await TestValidator.httpError(
    "comment retrieval with wrong article ID should return 404",
    404,
    async () => {
      await api.functional.discussionBoard.articles.comments.at(
        userConnection,
        {
          articleId: firstArticle.id,
          commentId: comment.id,
        },
      );
    },
  );
}
