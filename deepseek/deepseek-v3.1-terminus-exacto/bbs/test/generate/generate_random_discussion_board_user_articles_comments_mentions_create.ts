import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardCommentMention } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentMention";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_discussion_board_comment_mention } from "../prepare/prepare_random_discussion_board_comment_mention";

export async function generate_random_discussion_board_user_articles_comments_mentions_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IDiscussionBoardCommentMention.ICreate>;
    params: {
      articleId: string;
      commentId: string;
    };
  },
): Promise<IDiscussionBoardCommentMention> {
  const prepared: IDiscussionBoardCommentMention.ICreate =
    prepare_random_discussion_board_comment_mention(props.body);
  const result: IDiscussionBoardCommentMention =
    await api.functional.discussionBoard.user.articles.comments.mentions.create(
      connection,
      {
        body: prepared,
        articleId: props.params.articleId,
        commentId: props.params.commentId,
      },
    );
  return result;
}
