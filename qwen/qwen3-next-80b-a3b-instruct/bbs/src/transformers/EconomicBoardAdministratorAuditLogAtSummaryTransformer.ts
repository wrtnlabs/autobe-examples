import { IEconomicBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardAdministrator";
import { IEconomicBoardAdministratorAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardAdministratorAuditLog";
import { IEconomicBoardCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardCitizen";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EconomicBoardAdministratorAtSummaryTransformer } from "./EconomicBoardAdministratorAtSummaryTransformer";
import { EconomicBoardCitizenAtSummaryTransformer } from "./EconomicBoardCitizenAtSummaryTransformer";

export namespace EconomicBoardAdministratorAuditLogAtSummaryTransformer {
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
        actor: EconomicBoardAdministratorAtSummaryTransformer.select(),
        target: EconomicBoardCitizenAtSummaryTransformer.select(),
      },
    } satisfies Prisma.economic_board_administrator_audit_logsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEconomicBoardAdministratorAuditLog.ISummary> {
    return {
      id: input.id,
      action_type: typia.assert<
        IEconomicBoardAdministratorAuditLog.ISummary["action_type"]
      >(input.action_type),
      reason: input.reason ?? undefined,
      ip_address: input.ip_address,
      created_at: toISOStringSafe(input.created_at),
      actor: await EconomicBoardAdministratorAtSummaryTransformer.transform(
        input.actor,
      ),
      target: input.target
        ? await EconomicBoardCitizenAtSummaryTransformer.transform(input.target)
        : undefined,
    };
  }
}
