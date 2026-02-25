import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardCommentModeration } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentModeration";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_discussion_board_comment_moderation } from "../prepare/prepare_random_discussion_board_comment_moderation";

export async function generate_random_discussion_board_admin_comments_moderations_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IDiscussionBoardCommentModeration.ICreate> | undefined;
    params: {
      commentId: string;
    };
  },
): Promise<IDiscussionBoardCommentModeration> {
  const prepared: IDiscussionBoardCommentModeration.ICreate =
    prepare_random_discussion_board_comment_moderation(props.body);
  return await api.functional.discussionBoard.admin.comments.moderations.create(
    connection,
    {
      body: prepared,
      commentId: props.params.commentId,
    },
  );
}
