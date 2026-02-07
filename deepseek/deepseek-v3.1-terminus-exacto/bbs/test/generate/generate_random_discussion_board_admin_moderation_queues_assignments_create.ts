import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardContentModerationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentModerationQueue";
import type { IDiscussionBoardContentModerationQueueAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentModerationQueueAssignment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_discussion_board_content_moderation_queue_assignment } from "../prepare/prepare_random_discussion_board_content_moderation_queue_assignment";

export async function generate_random_discussion_board_admin_moderation_queues_assignments_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IDiscussionBoardContentModerationQueueAssignment.ICreate>;
  },
): Promise<IDiscussionBoardContentModerationQueueAssignment> {
  const prepared: IDiscussionBoardContentModerationQueueAssignment.ICreate =
    prepare_random_discussion_board_content_moderation_queue_assignment(
      props.body,
    );
  const result: IDiscussionBoardContentModerationQueueAssignment =
    await api.functional.discussionBoard.admin.moderation_queues.assignments.create(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
