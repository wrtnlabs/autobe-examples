import { IAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IAdministrator";
import { IEconomicBoardAdministratorAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardAdministratorAuditLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IUser";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { AdministratorAtSummaryTransformer } from "./AdministratorAtSummaryTransformer";
import { UserAtSummaryTransformer } from "./UserAtSummaryTransformer";

export namespace EconomicBoardAdministratorAuditLogTransformer {
  export type Payload =
    Prisma.economic_board_administrator_audit_logsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        action_type: true,
        reason: true,
        ip_address: true,
        created_at: true,
        updated_at: true,
        actor: AdministratorAtSummaryTransformer.select(),
        target: UserAtSummaryTransformer.select(),
      },
    } satisfies Prisma.economic_board_administrator_audit_logsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEconomicBoardAdministratorAuditLog> {
    return {
      id: input.id,
      actor_id: input.actor.id,
      target_id: input.target?.id ?? null,
      action_type: typia.assert<
        | "ban"
        | "unban"
        | "promote"
        | "demote"
        | "delete_article"
        | "delete_comment"
        | "delete_section"
        | "approve_admin_request"
        | "reject_admin_request"
      >(input.action_type),
      reason: input.reason,
      ip_address: input.ip_address,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      actor: await AdministratorAtSummaryTransformer.transform(input.actor),
      target: input.target
        ? await UserAtSummaryTransformer.transform(input.target)
        : null,
    };
  }
}
