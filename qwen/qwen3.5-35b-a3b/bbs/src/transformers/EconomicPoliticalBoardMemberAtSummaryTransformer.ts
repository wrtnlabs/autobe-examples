import { IEconomicPoliticalBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EconomicPoliticalBoardMemberAtSummaryTransformer {
  export type Payload =
    Prisma.economic_political_board_administrator_rolesGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        created_at: true,
        user: {
          select: {
            id: true,
          },
        } satisfies Prisma.economic_political_board_administrator_rolesFindManyArgs,
      },
    } satisfies Prisma.economic_political_board_administrator_rolesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEconomicPoliticalBoardMember.ISummary> {
    return {
      id: input.id,
      createdAt: input.created_at.toISOString(),
      displayName: input.user.id,
    };
  }
}
