import { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardAdministratorPromotionRequestAtReviewTransformer {
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
        user: true,
        administrator: true,
        discussion_board_administrator_id: true,
      },
    } satisfies Prisma.discussion_board_administrator_promotion_requestsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardAdministratorPromotionRequest.IReview> {
    return {
      approved: input.approved_at !== null,
      notes: input.reviewer_notes ?? undefined,
    };
  }
}
