import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardCommentModeration } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentModeration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_discussion_board_comment_moderation } from "../prepare/prepare_random_discussion_board_comment_moderation";

export async function generate_random_discussion_board_admin_comments_bulk_moderations_bulk_moderate(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IDiscussionBoardCommentModeration.ICreate> | undefined;
  },
): Promise<IDiscussionBoardCommentModeration.IBulkResult> {
  const prepared: IDiscussionBoardCommentModeration.ICreate =
    prepare_random_discussion_board_comment_moderation(props.body);
  return await api.functional.discussionBoard.admin.comments.bulk_moderations.bulkModerate(
    connection,
    {
      body: prepared,
    },
  );
}
