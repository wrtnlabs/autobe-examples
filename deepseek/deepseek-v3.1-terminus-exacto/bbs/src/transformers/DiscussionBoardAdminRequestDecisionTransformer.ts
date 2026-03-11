import { IDiscussionBoardAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminRequest";
import { IDiscussionBoardAdminRequestDecision } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminRequestDecision";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { DiscussionBoardAdminRequestAtSummaryTransformer } from "./DiscussionBoardAdminRequestAtSummaryTransformer";
import { DiscussionBoardSuperAdminAtSummaryTransformer } from "./DiscussionBoardSuperAdminAtSummaryTransformer";

export namespace DiscussionBoardAdminRequestDecisionTransformer {
  export type Payload =
    Prisma.discussion_board_admin_request_decisionsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        decision: true,
        rejection_reason: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        adminRequest: DiscussionBoardAdminRequestAtSummaryTransformer.select(),
        superAdmin: DiscussionBoardSuperAdminAtSummaryTransformer.select(),
      },
    } satisfies Prisma.discussion_board_admin_request_decisionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardAdminRequestDecision> {
    return {
      id: input.id,
      decision: input.decision as "approved" | "rejected",
      rejection_reason: input.rejection_reason ?? null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at ? input.deleted_at.toISOString() : null,
      adminRequest:
        await DiscussionBoardAdminRequestAtSummaryTransformer.transform(
          input.adminRequest,
        ),
      superAdmin: await DiscussionBoardSuperAdminAtSummaryTransformer.transform(
        input.superAdmin,
      ),
    };
  }
}
