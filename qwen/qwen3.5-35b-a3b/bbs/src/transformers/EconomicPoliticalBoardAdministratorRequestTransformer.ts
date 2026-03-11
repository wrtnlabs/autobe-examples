import { IEconomicPoliticalBoardAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdministratorRequest";
import { IEconomicPoliticalBoardAdministratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdministratorRole";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EconomicPoliticalBoardAdministratorRoleAtSummaryTransformer } from "./EconomicPoliticalBoardAdministratorRoleAtSummaryTransformer";

export namespace EconomicPoliticalBoardAdministratorRequestTransformer {
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
  ): Promise<IEconomicPoliticalBoardAdministratorRequest> {
    return {
      id: input.id,
      reason: input.reason,
      status: input.status,
      reviewed_at: input.reviewed_at?.toISOString() ?? null,
      review_notes: input.review_notes ?? null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      user: await EconomicPoliticalBoardAdministratorRoleAtSummaryTransformer.transform(
        input.user,
      ),
      reviewedByAdmin: input.reviewedByAdmin
        ? await EconomicPoliticalBoardAdministratorRoleAtSummaryTransformer.transform(
            input.reviewedByAdmin,
          )
        : null,
    };
  }
}
