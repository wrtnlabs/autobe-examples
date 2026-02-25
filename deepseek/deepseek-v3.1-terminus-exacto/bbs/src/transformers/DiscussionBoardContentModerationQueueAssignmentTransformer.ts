import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import { IDiscussionBoardContentFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentFlag";
import { IDiscussionBoardContentModerationQueueAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentModerationQueueAssignment";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { DiscussionBoardAdminAtSummaryTransformer } from "./DiscussionBoardAdminAtSummaryTransformer";
import { DiscussionBoardContentFlagAtSummaryTransformer } from "./DiscussionBoardContentFlagAtSummaryTransformer";

export namespace DiscussionBoardContentModerationQueueAssignmentTransformer {
  export type Payload =
    Prisma.discussion_board_content_moderation_queuesGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        moderation_status: true,
        priority_level: true,
        escalation_reason: true,
        assignment_history_count: true,
        auto_flagged: true,
        created_at: true,
        updated_at: true,
        assigned_at: true,
        resolved_at: true,
        contentFlag: DiscussionBoardContentFlagAtSummaryTransformer.select(),
        assignedAdmin: DiscussionBoardAdminAtSummaryTransformer.select(),
        escalatedByAdmin: DiscussionBoardAdminAtSummaryTransformer.select(),
      },
    } satisfies Prisma.discussion_board_content_moderation_queuesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardContentModerationQueueAssignment> {
    return {
      id: input.id,
      moderationStatus: input.moderation_status,
      priorityLevel: input.priority_level,
      escalationReason: input.escalation_reason ?? undefined,
      assignmentHistoryCount: input.assignment_history_count,
      autoFlagged: input.auto_flagged,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      assignedAt: input.assigned_at?.toISOString() ?? undefined,
      resolvedAt: input.resolved_at?.toISOString() ?? undefined,
      contentFlag:
        await DiscussionBoardContentFlagAtSummaryTransformer.transform(
          input.contentFlag,
        ),
      assignedAdmin: input.assignedAdmin
        ? await DiscussionBoardAdminAtSummaryTransformer.transform(
            input.assignedAdmin,
          )
        : undefined,
      escalatedByAdmin: input.escalatedByAdmin
        ? await DiscussionBoardAdminAtSummaryTransformer.transform(
            input.escalatedByAdmin,
          )
        : undefined,
    };
  }
}
