import { IDiscussionBoardAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminRequest";
import { IDiscussionBoardAdminRequestDecision } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminRequestDecision";
import { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { DiscussionBoardAdminRequestAtSummaryTransformer } from "./DiscussionBoardAdminRequestAtSummaryTransformer";
import { DiscussionBoardAdministratorAtSummaryTransformer } from "./DiscussionBoardAdministratorAtSummaryTransformer";

export namespace DiscussionBoardAdminRequestDecisionAtSummaryTransformer {
  export type Payload =
    Prisma.discussion_board_admin_request_decisionsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        decision_type: true,
        decision_context: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        reviewer: DiscussionBoardAdministratorAtSummaryTransformer.select(),
        adminRequest: DiscussionBoardAdminRequestAtSummaryTransformer.select(),
      },
    } satisfies Prisma.discussion_board_admin_request_decisionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardAdminRequestDecision.ISummary> {
    return {
      id: input.id,
      decision_type: input.decision_type,
      decision_context: input.decision_context ?? null,
      created_at: input.created_at.toISOString(),
      reviewer:
        await DiscussionBoardAdministratorAtSummaryTransformer.transform(
          input.reviewer,
        ),
      adminRequest:
        await DiscussionBoardAdminRequestAtSummaryTransformer.transform(
          input.adminRequest,
        ),
    };
  }
}
