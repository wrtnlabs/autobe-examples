import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminRequest";
import { IDiscussionBoardAdministrativeHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrativeHistory";
import { IDiscussionBoardAdministratorAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorAssignment";
import { IDiscussionBoardAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuditLog";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IDiscussionBoardUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { DiscussionBoardAdminAtSummaryTransformer } from "./DiscussionBoardAdminAtSummaryTransformer";
import { DiscussionBoardAdminRequestAtSummaryTransformer } from "./DiscussionBoardAdminRequestAtSummaryTransformer";
import { DiscussionBoardAdministratorAssignmentAtSummaryTransformer } from "./DiscussionBoardAdministratorAssignmentAtSummaryTransformer";
import { DiscussionBoardAuditLogAtSummaryTransformer } from "./DiscussionBoardAuditLogAtSummaryTransformer";
import { DiscussionBoardUserBanAtSummaryTransformer } from "./DiscussionBoardUserBanAtSummaryTransformer";

export namespace DiscussionBoardAdministrativeHistoryTransformer {
  export type Payload =
    Prisma.discussion_board_administrative_historiesGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        action_type: true,
        target_type: true,
        target_id: true,
        description: true,
        previous_status: true,
        new_status: true,
        created_at: true,
        updated_at: true,
        administrator: DiscussionBoardAdminAtSummaryTransformer.select(),
        adminRequest: DiscussionBoardAdminRequestAtSummaryTransformer.select(),
        userBan: DiscussionBoardUserBanAtSummaryTransformer.select(),
        administratorAssignment:
          DiscussionBoardAdministratorAssignmentAtSummaryTransformer.select(),
        auditLog: DiscussionBoardAuditLogAtSummaryTransformer.select(),
      },
    } satisfies Prisma.discussion_board_administrative_historiesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardAdministrativeHistory> {
    return {
      id: input.id,
      action_type: input.action_type,
      target_type: input.target_type,
      target_id: input.target_id,
      description: input.description,
      previous_status: input.previous_status ?? undefined,
      new_status: input.new_status ?? undefined,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      administrator: await DiscussionBoardAdminAtSummaryTransformer.transform(
        input.administrator,
      ),
      adminRequest: input.adminRequest
        ? await DiscussionBoardAdminRequestAtSummaryTransformer.transform(
            input.adminRequest,
          )
        : null,
      userBan: input.userBan
        ? await DiscussionBoardUserBanAtSummaryTransformer.transform(
            input.userBan,
          )
        : null,
      administratorAssignment: input.administratorAssignment
        ? await DiscussionBoardAdministratorAssignmentAtSummaryTransformer.transform(
            input.administratorAssignment,
          )
        : null,
      auditLog: input.auditLog
        ? await DiscussionBoardAuditLogAtSummaryTransformer.transform(
            input.auditLog,
          )
        : null,
    };
  }
}
