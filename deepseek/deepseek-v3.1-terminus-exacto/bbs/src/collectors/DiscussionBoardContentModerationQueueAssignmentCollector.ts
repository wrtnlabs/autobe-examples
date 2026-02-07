import { IDiscussionBoardContentModerationQueueAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentModerationQueueAssignment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace DiscussionBoardContentModerationQueueAssignmentCollector {
  export async function collect(props: {
    body: IDiscussionBoardContentModerationQueueAssignment.ICreate;
  }) {
    const id: string = v4();
    return {
      // Scalar fields
      id,
      assigned_at: new Date(),
      completed_at: null,
      created_at: new Date(),
      updated_at: new Date(),
      // BelongsTo relations
      contentModerationQueue: {
        connect: {
          id: props.body.discussion_board_content_moderation_queue_id,
        },
      },
      assignedAdmin: {
        connect: { id: props.body.assigned_admin_id },
      },
    } satisfies Prisma.discussion_board_content_moderation_queue_assignmentsCreateInput;
  }
}
