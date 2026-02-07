import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardContentModerationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentModerationQueue";
import { IDiscussionBoardContentModerationQueueAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentModerationQueueAssignment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { DiscussionBoardAdminAtSummaryTransformer } from "./DiscussionBoardAdminAtSummaryTransformer";
import { DiscussionBoardContentModerationQueueAtSummaryTransformer } from "./DiscussionBoardContentModerationQueueAtSummaryTransformer";

export namespace DiscussionBoardContentModerationQueueAssignmentAtSummaryTransformer {
  export type Payload =
    Prisma.discussion_board_content_moderation_queue_assignmentsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        assigned_at: true,
        completed_at: true,
        created_at: true,
        updated_at: true,
        contentModerationQueue:
          DiscussionBoardContentModerationQueueAtSummaryTransformer.select(),
        assignedAdmin: DiscussionBoardAdminAtSummaryTransformer.select(),
      },
    } satisfies Prisma.discussion_board_content_moderation_queue_assignmentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardContentModerationQueueAssignment.ISummary> {
    return {
      id: input.id,
      assigned_at: input.assigned_at.toISOString(),
      completed_at: input.completed_at
        ? input.completed_at.toISOString()
        : null,
      assignedAdmin: await DiscussionBoardAdminAtSummaryTransformer.transform(
        input.assignedAdmin,
      ),
      contentModerationQueue:
        await DiscussionBoardContentModerationQueueAtSummaryTransformer.transform(
          input.contentModerationQueue,
        ),
    };
  }
}
