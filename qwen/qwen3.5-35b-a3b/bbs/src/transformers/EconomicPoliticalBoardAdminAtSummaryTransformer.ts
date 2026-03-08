import { IEconomicPoliticalBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdmin";
import { IEconomicPoliticalBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EconomicPoliticalBoardAdminAtSummaryTransformer {
  export type Payload =
    Prisma.economic_political_board_administrator_rolesGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        user_id: true,
        grade: true,
        promotedByUser: {
          select: {
            id: true,
          },
        },
        promoted_at: true,
        created_at: true,
        updated_at: true,
        user: {
          select: {
            id: true,
          },
        },
      },
    } satisfies Prisma.economic_political_board_administrator_rolesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEconomicPoliticalBoardAdmin.ISummary> {
    return {
      id: input.id,
      userId: input.user_id,
      grade: input.grade as "regular" | "super",
      promotedByUserId: input.promotedByUser?.id ?? null,
      promotedAt: input.promoted_at?.toISOString() ?? null,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      user: {
        id: input.user.id,
        email: "",
        displayName: "",
        bio: "",
      } satisfies IEconomicPoliticalBoardMember.ISummary,
    };
  }
}
