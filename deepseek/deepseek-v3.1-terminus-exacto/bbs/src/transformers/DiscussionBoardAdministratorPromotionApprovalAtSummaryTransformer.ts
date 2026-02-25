import { IDiscussionBoardAdministratorPromotionApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionApproval";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { DiscussionBoardUserAtSummaryTransformer } from "./DiscussionBoardUserAtSummaryTransformer";

export namespace DiscussionBoardAdministratorPromotionApprovalAtSummaryTransformer {
  export type Payload =
    Prisma.discussion_board_administrator_promotion_requestsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        reason: true,
        status: true,
        approved_at: true,
        rejected_at: true,
        reviewer_discussion_board_super_admin_id: true,
        reviewer_notes: true,
        created_at: true,
        updated_at: true,
        user: DiscussionBoardUserAtSummaryTransformer.select(),
        administrator: true,
        approvals: true,
        workflowTransitions: true,
      },
    } satisfies Prisma.discussion_board_administrator_promotion_requestsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardAdministratorPromotionApproval.ISummary> {
    return {
      id: input.id,
      user: await DiscussionBoardUserAtSummaryTransformer.transform(input.user),
      reason: input.reason,
      status: input.status as "pending" | "approved" | "rejected",
      created_at: input.created_at.toISOString(),
      approved_at: input.approved_at ? input.approved_at.toISOString() : null,
      rejected_at: input.rejected_at ? input.rejected_at.toISOString() : null,
      reviewer_notes: input.reviewer_notes,
    };
  }
}
