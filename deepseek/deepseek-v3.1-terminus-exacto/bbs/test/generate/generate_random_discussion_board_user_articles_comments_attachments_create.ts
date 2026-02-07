import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardCommentAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentAttachment";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_discussion_board_comment_attachment } from "../prepare/prepare_random_discussion_board_comment_attachment";

export async function generate_random_discussion_board_user_articles_comments_attachments_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IDiscussionBoardCommentAttachment.ICreate>;
    params: {
      articleId: string;
      commentId: string;
    };
  },
): Promise<IDiscussionBoardCommentAttachment> {
  const prepared: IDiscussionBoardCommentAttachment.ICreate =
    prepare_random_discussion_board_comment_attachment(props.body);
  const result: IDiscussionBoardCommentAttachment =
    await api.functional.discussionBoard.user.articles.comments.attachments.create(
      connection,
      {
        articleId: props.params.articleId,
        commentId: props.params.commentId,
        body: prepared,
      },
    );
  return result;
}
