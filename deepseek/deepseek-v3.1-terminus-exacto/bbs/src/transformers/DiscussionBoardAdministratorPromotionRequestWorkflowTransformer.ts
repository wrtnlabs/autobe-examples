import { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import { IDiscussionBoardAdministratorPromotionRequestWorkflow } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequestWorkflow";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { DiscussionBoardAdministratorPromotionRequestAtSummaryTransformer } from "./DiscussionBoardAdministratorPromotionRequestAtSummaryTransformer";

export namespace DiscussionBoardAdministratorPromotionRequestWorkflowTransformer {
  export type Payload =
    Prisma.discussion_board_promotion_request_workflowsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        status: true,
        notes: true,
        created_at: true,
        promotionRequest:
          DiscussionBoardAdministratorPromotionRequestAtSummaryTransformer.select(),
      },
    } satisfies Prisma.discussion_board_promotion_request_workflowsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardAdministratorPromotionRequestWorkflow> {
    return {
      id: input.id,
      status: input.status,
      notes: input.notes ?? null,
      created_at: input.created_at.toISOString(),
      promotionRequest:
        await DiscussionBoardAdministratorPromotionRequestAtSummaryTransformer.transform(
          input.promotionRequest,
        ),
    };
  }
}
