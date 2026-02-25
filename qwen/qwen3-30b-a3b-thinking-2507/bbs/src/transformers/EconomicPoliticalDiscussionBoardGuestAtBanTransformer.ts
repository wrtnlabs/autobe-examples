import { IEconomicPoliticalDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardGuest";
import { IEconomicPoliticalDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EconomicPoliticalDiscussionBoardUserAtSummaryTransformer } from "./EconomicPoliticalDiscussionBoardUserAtSummaryTransformer";

export namespace EconomicPoliticalDiscussionBoardGuestAtBanTransformer {
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
        deleted_at: true,
        bannedUser:
          EconomicPoliticalDiscussionBoardUserAtSummaryTransformer.select(),
        appliedBy:
          EconomicPoliticalDiscussionBoardUserAtSummaryTransformer.select(),
        updated_at: true,
      },
    } satisfies Prisma.economic_political_discussion_board_bansFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEconomicPoliticalDiscussionBoardGuest.IBan> {
    return {
      id: input.id,
      bannedUser:
        await EconomicPoliticalDiscussionBoardUserAtSummaryTransformer.transform(
          input.bannedUser,
        ),
      appliedBy:
        await EconomicPoliticalDiscussionBoardUserAtSummaryTransformer.transform(
          input.appliedBy,
        ),
      banReason: input.reason,
      status: input.active
        ? "active"
        : input.deleted_at
          ? "expired"
          : "revoked",
      createdAt: input.created_at.toISOString(),
      expiredAt: input.deleted_at ? input.deleted_at.toISOString() : null,
    };
  }
}
