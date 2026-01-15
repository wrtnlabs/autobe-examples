import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IDiscussionBoardArticleCommentReply } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCommentReply";
import { prepare_random_discussion_board_article_comment_reply } from "../prepare/prepare_random_discussion_board_article_comment_reply";
export async function generate_random_discussion_board_citizen_comments_replies_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IDiscussionBoardArticleCommentReply.ICreate>;
    params?: {
      commentId: string;
    };
  },
): Promise<IDiscussionBoardArticleCommentReply> {
  const prepared: IDiscussionBoardArticleCommentReply.ICreate =
    prepare_random_discussion_board_article_comment_reply(props.body);
  const commentId: string & tags.Format<"uuid"> = props.params?.commentId ?? typia.random<string & tags.Format<"uuid">>();
  const result: IDiscussionBoardArticleCommentReply =
    await api.functional.discussionBoard.citizen.comments.replies.create(
      connection,
      {
        commentId,
        body: prepared,
      },
    );
  return result;
}
