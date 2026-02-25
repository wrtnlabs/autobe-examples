import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardAdministratorPromotionApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionApproval";
import { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { DiscussionBoardUserAtSummaryTransformer } from "./DiscussionBoardUserAtSummaryTransformer";

// Temporary interface until proper transformer is available
interface ISuperAdminSummary {
  id: string;
  email: string;
  display_name: string;
  created_at: string;
}
export namespace DiscussionBoardAdministratorPromotionApprovalTransformer {
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
        reviewer_notes: true,
        created_at: true,
        updated_at: true,
        reviewer_discussion_board_super_admin_id: true,
        user: DiscussionBoardUserAtSummaryTransformer.select(),
        administrator: { select: { id: true } },
        approvals: { select: { id: true } },
        workflowTransitions: { select: { id: true } },
      },
    } satisfies Prisma.discussion_board_administrator_promotion_requestsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardAdministratorPromotionApproval> {
    // Mock reviewer data for now - needs proper SuperAdmin transformer
    const mockReviewer: ISuperAdminSummary | null =
      input.reviewer_discussion_board_super_admin_id
        ? {
            id: input.reviewer_discussion_board_super_admin_id,
            email: "reviewer@example.com",
            display_name: "Super Administrator",
            created_at: new Date().toISOString(),
          }
        : null;
    return {
      id: input.id,
      reason: input.reason,
      status: input.status,
      approved_at: input.approved_at
        ? toISOStringSafe(input.approved_at)
        : null,
      rejected_at: input.rejected_at
        ? toISOStringSafe(input.rejected_at)
        : null,
      reviewer_notes: input.reviewer_notes ?? null,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      user: await DiscussionBoardUserAtSummaryTransformer.transform(input.user),
      administrator: input.administrator
        ? ({ id: input.administrator.id } as any)
        : undefined,
      reviewer: mockReviewer ? (mockReviewer as any) : undefined,
    };
  }
}
