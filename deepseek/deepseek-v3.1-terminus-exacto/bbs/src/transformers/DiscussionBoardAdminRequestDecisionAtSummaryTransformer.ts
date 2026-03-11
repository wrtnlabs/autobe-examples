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

export namespace DiscussionBoardAdminRequestDecisionAtSummaryTransformer {
  export type Payload =
    Prisma.discussion_board_admin_request_decisionsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        decision: true,
        created_at: true,
        adminRequest: DiscussionBoardAdminRequestAtSummaryTransformer.select(),
        superAdmin: DiscussionBoardSuperAdminAtSummaryTransformer.select(),
      },
    } satisfies Prisma.discussion_board_admin_request_decisionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardAdminRequestDecision.ISummary> {
    return {
      id: input.id,
      decision: input.decision,
      created_at: input.created_at.toISOString(),
      admin_request:
        await DiscussionBoardAdminRequestAtSummaryTransformer.transform(
          input.adminRequest,
        ),
      super_admin:
        await DiscussionBoardSuperAdminAtSummaryTransformer.transform(
          input.superAdmin,
        ),
    };
  }
}
