import { IEconomicPoliticalBoardAdministratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdministratorRole";
import { IEconomicPoliticalBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardMember";
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
  export function select() {
    return {
      select: {
        id: true,
        grade: true,
        promoted_at: true,
        created_at: true,
        updated_at: true,
        user: {
          select: {
            id: true,
          },
        },
        promotedByUser: {
          select: {
            id: true,
          },
        },
      },
    } satisfies Prisma.economic_political_board_administrator_rolesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEconomicPoliticalBoardAdministratorRole.ISummary> {
    return {
      id: input.id,
      userId: input.user.id,
      grade: typia.assert<"regular" | "super">(input.grade),
      promotedByUserId: input.promotedByUser?.id ?? null,
      promotedAt: input.promoted_at ? toISOStringSafe(input.promoted_at) : null,
      createdAt: toISOStringSafe(input.created_at),
      updatedAt: toISOStringSafe(input.updated_at),
      user: {
        id: input.user.id,
        displayName: "",
        email: "placeholder@example.com",
        bio: "",
      },
    };
  }
}
