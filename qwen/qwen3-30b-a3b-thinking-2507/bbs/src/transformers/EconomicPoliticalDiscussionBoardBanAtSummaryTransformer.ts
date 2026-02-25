import { IEconomicPoliticalDiscussionBoardBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardBan";
import { IEconomicPoliticalDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EconomicPoliticalDiscussionBoardUserAtSummaryTransformer } from "./EconomicPoliticalDiscussionBoardUserAtSummaryTransformer";

export namespace EconomicPoliticalDiscussionBoardBanAtSummaryTransformer {
  export type Payload =
    Prisma.economic_political_discussion_board_bansGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        reason: true,
        active: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        bannedUser:
          EconomicPoliticalDiscussionBoardUserAtSummaryTransformer.select(),
        appliedBy:
          EconomicPoliticalDiscussionBoardUserAtSummaryTransformer.select(),
      },
    } satisfies Prisma.economic_political_discussion_board_bansFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEconomicPoliticalDiscussionBoardBan.ISummary> {
    return {
      id: input.id,
      reason: input.reason,
      active: input.active,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      bannedUser:
        await EconomicPoliticalDiscussionBoardUserAtSummaryTransformer.transform(
          input.bannedUser,
        ),
      appliedBy:
        await EconomicPoliticalDiscussionBoardUserAtSummaryTransformer.transform(
          input.appliedBy,
        ),
    };
  }
}
