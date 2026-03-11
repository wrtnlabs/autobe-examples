import { IEconomicPoliticalBoardAdministratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdministratorRole";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EconomicPoliticalBoardAdministratorRoleAtSummaryTransformer {
  export type Payload =
    Prisma.economic_political_board_administrator_rolesGetPayload<
      ReturnType<typeof select>
    >;
  type Select = {
    select: {
      id: true;
      grade: true;
      promoted_at: true;
      created_at: true;
      updated_at: true;
      promotedByUser: Select;
    };
  };
  export function select(): Select {
    return {
      select: {
        id: true,
        grade: true,
        promoted_at: true,
        created_at: true,
        updated_at: true,
        promotedByUser:
          EconomicPoliticalBoardAdministratorRoleAtSummaryTransformer.select(),
      },
    };
  }
  export async function transform(
    input: Payload,
  ): Promise<IEconomicPoliticalBoardAdministratorRole.ISummary> {
    return {
      id: input.id,
      grade: typia.assert<
        IEconomicPoliticalBoardAdministratorRole.ISummary["grade"]
      >(input.grade),
      promoted_at: input.promoted_at
        ? toISOStringSafe(input.promoted_at)
        : null,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      promoted_by_user: input.promotedByUser
        ? await EconomicPoliticalBoardAdministratorRoleAtSummaryTransformer.transform(
            input.promotedByUser,
          )
        : null,
    };
  }
}
