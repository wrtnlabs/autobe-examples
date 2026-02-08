import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardCommentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_discussion_board_comment_snapshot } from "../prepare/prepare_random_discussion_board_comment_snapshot";

export async function generate_random_discussion_board_administrator_comments_snapshots_create_snapshot(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IDiscussionBoardCommentSnapshot.ICreate> | undefined;
    params: {
      commentId: string;
    };
  },
): Promise<IDiscussionBoardCommentSnapshot> {
  const prepared: IDiscussionBoardCommentSnapshot.ICreate =
    prepare_random_discussion_board_comment_snapshot(props.body);
  const result: IDiscussionBoardCommentSnapshot =
    await api.functional.discussionBoard.administrator.comments.snapshots.createSnapshot(
      connection,
      {
        commentId: props.params.commentId,
        body: prepared,
      },
    );
  return result;
}
