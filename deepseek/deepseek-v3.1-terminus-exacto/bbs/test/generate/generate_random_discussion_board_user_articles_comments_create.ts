import api from "@ORGANIZATION/PROJECT-api";
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

import { prepare_random_discussion_board_comment } from "../prepare/prepare_random_discussion_board_comment";

export async function generate_random_discussion_board_user_articles_comments_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IDiscussionBoardComment.ICreate>;
    params?: {
      articleId: string;
    };
  },
): Promise<IDiscussionBoardComment> {
  const prepared: IDiscussionBoardComment.ICreate =
    prepare_random_discussion_board_comment(props.body);
  const result: IDiscussionBoardComment =
    await api.functional.discussionBoard.user.articles.comments.create(
      connection,
      {
        articleId: typia.assert<string & tags.Format<"uuid">>(props.params?.articleId ?? "00000000-0000-0000-0000-000000000000"),
        body: prepared,
      },
    );
  return result;
}