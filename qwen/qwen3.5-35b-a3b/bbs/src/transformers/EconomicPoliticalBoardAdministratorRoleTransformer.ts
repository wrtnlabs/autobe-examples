import { IEconomicPoliticalBoardAdministratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdministratorRole";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EconomicPoliticalBoardAdministratorRoleAtSummaryTransformer } from "./EconomicPoliticalBoardAdministratorRoleAtSummaryTransformer";

export namespace EconomicPoliticalBoardAdministratorRoleTransformer {
  export type Payload =
    Prisma.economic_political_board_administrator_rolesGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        grade: true,
        promoted_at: true,
        created_at: true,
        updated_at: true,
        user: EconomicPoliticalBoardAdministratorRoleAtSummaryTransformer.select(),
        promotedByUser:
          EconomicPoliticalBoardAdministratorRoleAtSummaryTransformer.select(),
      },
    } satisfies Prisma.economic_political_board_administrator_rolesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEconomicPoliticalBoardAdministratorRole> {
    return {
      id: input.id,
      grade: typia.assert<"regular" | "super">(input.grade),
      promoted_at: input.promoted_at
        ? toISOStringSafe(input.promoted_at)
        : null,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      user: await EconomicPoliticalBoardAdministratorRoleAtSummaryTransformer.transform(
        input.user,
      ),
      promotedByUser: input.promotedByUser
        ? await EconomicPoliticalBoardAdministratorRoleAtSummaryTransformer.transform(
            input.promotedByUser,
          )
        : null,
    };
  }
}
