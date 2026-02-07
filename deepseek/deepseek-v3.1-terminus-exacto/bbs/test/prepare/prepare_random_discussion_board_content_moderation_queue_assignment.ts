import { IDiscussionBoardContentModerationQueueAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentModerationQueueAssignment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_discussion_board_content_moderation_queue_assignment(
  input?: DeepPartial<IDiscussionBoardContentModerationQueueAssignment.ICreate>,
): IDiscussionBoardContentModerationQueueAssignment.ICreate {
  return {
    discussion_board_content_moderation_queue_id:
      input?.discussion_board_content_moderation_queue_id ??
      typia.random<string & tags.Format<"uuid">>(),
    assigned_admin_id:
      input?.assigned_admin_id ?? typia.random<string & tags.Format<"uuid">>(),
  };
}
