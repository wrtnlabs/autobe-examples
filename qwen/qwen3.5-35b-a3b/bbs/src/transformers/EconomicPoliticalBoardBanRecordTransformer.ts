import { IEconomicPoliticalBoardAdministratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdministratorRole";
import { IEconomicPoliticalBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardBanRecord";
import { IEconomicPoliticalBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EconomicPoliticalBoardAdministratorRoleAtSummaryTransformer } from "./EconomicPoliticalBoardAdministratorRoleAtSummaryTransformer";

export namespace EconomicPoliticalBoardBanRecordTransformer {
  export type Payload = Prisma.economic_political_board_ban_recordsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        reason: true,
        created_at: true,
        user: EconomicPoliticalBoardAdministratorRoleAtSummaryTransformer.select(),
        bannedByAdmin:
          EconomicPoliticalBoardAdministratorRoleAtSummaryTransformer.select(),
      },
    } satisfies Prisma.economic_political_board_ban_recordsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEconomicPoliticalBoardBanRecord> {
    return {
      id: input.id,
      reason: input.reason,
      created_at: input.created_at.toISOString(),
      user: await EconomicPoliticalBoardAdministratorRoleAtSummaryTransformer.transform(
        input.user,
      ),
      bannedByAdmin:
        await EconomicPoliticalBoardAdministratorRoleAtSummaryTransformer.transform(
          input.bannedByAdmin,
        ),
    };
  }
}
