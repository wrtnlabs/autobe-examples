import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardContentModerationQueueEscalation } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentModerationQueueEscalation";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_discussion_board_content_moderation_queue_escalation } from "../prepare/prepare_random_discussion_board_content_moderation_queue_escalation";

export async function generate_random_discussion_board_super_admin_queues_escalate(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IDiscussionBoardContentModerationQueueEscalation.ICreate>;
    params: {
      queueId: string;
    };
  },
): Promise<IDiscussionBoardContentModerationQueueEscalation> {
  const prepared: IDiscussionBoardContentModerationQueueEscalation.ICreate =
    prepare_random_discussion_board_content_moderation_queue_escalation(
      props.body,
    );
  const result: IDiscussionBoardContentModerationQueueEscalation =
    await api.functional.discussionBoard.superAdmin.queues.escalate(
      connection,
      {
        queueId: props.params.queueId,
        body: prepared,
      },
    );
  return result;
}
