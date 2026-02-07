import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardCommentFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentFlag";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_discussion_board_comment_flag } from "../prepare/prepare_random_discussion_board_comment_flag";

export async function generate_random_discussion_board_user_articles_comments_flags_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IDiscussionBoardCommentFlag.ICreate>;
    params: {
      articleId: string;
      commentId: string;
    };
  },
): Promise<IDiscussionBoardCommentFlag> {
  const prepared: IDiscussionBoardCommentFlag.ICreate =
    prepare_random_discussion_board_comment_flag(props.body);
  const result: IDiscussionBoardCommentFlag =
    await api.functional.discussionBoard.user.articles.comments.flags.create(
      connection,
      {
        articleId: props.params.articleId,
        commentId: props.params.commentId,
        body: prepared,
      },
    );
  return result;
}
