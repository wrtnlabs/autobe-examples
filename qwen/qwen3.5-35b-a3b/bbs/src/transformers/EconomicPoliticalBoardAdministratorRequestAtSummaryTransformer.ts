import { IEconomicPoliticalBoardAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdministratorRequest";
import { IEconomicPoliticalBoardAdministratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdministratorRole";
import { IEconomicPoliticalBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EconomicPoliticalBoardAdministratorRoleAtSummaryTransformer } from "./EconomicPoliticalBoardAdministratorRoleAtSummaryTransformer";

export namespace EconomicPoliticalBoardAdministratorRequestAtSummaryTransformer {
  export type Payload =
    Prisma.economic_political_board_administrator_requestsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        reason: true,
        status: true,
        reviewed_at: true,
        review_notes: true,
        created_at: true,
        updated_at: true,
        user: EconomicPoliticalBoardAdministratorRoleAtSummaryTransformer.select(),
        reviewedByAdmin:
          EconomicPoliticalBoardAdministratorRoleAtSummaryTransformer.select(),
      },
    } satisfies Prisma.economic_political_board_administrator_requestsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEconomicPoliticalBoardAdministratorRequest.ISummary> {
    return {
      id: input.id,
      reason: input.reason,
      status: typia.assert<"pending" | "approved" | "rejected">(input.status),
      createdAt: toISOStringSafe(input.created_at),
      author:
        await EconomicPoliticalBoardAdministratorRoleAtSummaryTransformer.transform(
          input.user,
        ),
    };
  }
}
