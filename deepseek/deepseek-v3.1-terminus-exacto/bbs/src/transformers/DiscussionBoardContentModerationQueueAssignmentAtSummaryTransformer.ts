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

export namespace DiscussionBoardContentModerationQueueAssignmentAtSummaryTransformer {
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
        auto_flagged: true,
        assignment_history_count: true,
        created_at: true,
        updated_at: true,
        assigned_at: true,
        resolved_at: true,
        contentFlag: DiscussionBoardContentFlagAtSummaryTransformer.select(),
        assignedAdmin: DiscussionBoardAdminAtSummaryTransformer.select(),
        escalatedByAdmin: DiscussionBoardAdminAtSummaryTransformer.select(),
        assignmentHistories: {
          select: { id: true },
        } satisfies Prisma.discussion_board_content_moderation_queue_assignmentsFindManyArgs,
        escalations: {
          select: { id: true },
        } satisfies Prisma.discussion_board_content_moderation_queue_escalationsFindManyArgs,
      },
    } satisfies Prisma.discussion_board_content_moderation_queuesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardContentModerationQueueAssignment.ISummary> {
    return {
      id: input.id,
      moderation_status: input.moderation_status,
      priority_level: input.priority_level,
      auto_flagged: input.auto_flagged,
      assignment_history_count: input.assignment_history_count,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      assigned_at: input.assigned_at?.toISOString() ?? null,
      resolved_at: input.resolved_at?.toISOString() ?? null,
      contentFlag:
        await DiscussionBoardContentFlagAtSummaryTransformer.transform(
          input.contentFlag,
        ),
      assignedAdmin: input.assignedAdmin
        ? await DiscussionBoardAdminAtSummaryTransformer.transform(
            input.assignedAdmin,
          )
        : null,
      escalatedByAdmin: input.escalatedByAdmin
        ? await DiscussionBoardAdminAtSummaryTransformer.transform(
            input.escalatedByAdmin,
          )
        : null,
    };
  }
}
