import { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { DiscussionBoardUserAtSummaryTransformer } from "./DiscussionBoardUserAtSummaryTransformer";

export namespace DiscussionBoardAdministratorPromotionRequestAtSummaryTransformer {
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
        administrator: {
          select: {
            id: true,
          },
        } satisfies Prisma.discussion_board_administratorsFindManyArgs,
        approvals: {
          select: {
            id: true,
          },
        } satisfies Prisma.discussion_board_administrator_promotion_approvalsFindManyArgs,
        workflowTransitions: {
          select: {
            id: true,
          },
        } satisfies Prisma.discussion_board_promotion_request_workflowsFindManyArgs,
      },
    } satisfies Prisma.discussion_board_administrator_promotion_requestsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardAdministratorPromotionRequest.ISummary> {
    return {
      id: input.id,
      reason:
        input.reason.length > 100
          ? input.reason.substring(0, 97) + "..."
          : input.reason,
      status: input.status,
      created_at: input.created_at.toISOString(),
      user: await DiscussionBoardUserAtSummaryTransformer.transform(input.user),
    };
  }
}
