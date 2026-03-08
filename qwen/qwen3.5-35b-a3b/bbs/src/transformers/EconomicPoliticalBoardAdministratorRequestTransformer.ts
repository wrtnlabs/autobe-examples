import { IEconomicPoliticalBoardAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdministratorRequest";
import { IEconomicPoliticalBoardAdministratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdministratorRole";
import { IEconomicPoliticalBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardMember";
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
        user: {
          select: {
            id: true,
          },
        } satisfies Prisma.economic_political_board_administrator_rolesFindManyArgs,
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
      user: {
        id: input.user.id,
        email: "" as string & tags.Format<"email">,
        displayName: "" as string,
        bio: "" as string,
      } as IEconomicPoliticalBoardMember.ISummary,
      reason: input.reason,
      status: typia.assert<"pending" | "approved" | "rejected">(input.status),
      reviewed_by_admin_id: input.reviewed_by_admin_id ?? undefined,
      reviewed_by_admin: input.reviewedByAdmin
        ? await EconomicPoliticalBoardAdministratorRoleAtSummaryTransformer.transform(
            input.reviewedByAdmin,
          )
        : null,
      reviewed_at: input.reviewed_at
        ? toISOStringSafe(input.reviewed_at)
        : null,
      review_notes: input.review_notes ?? null,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
    };
  }
}
