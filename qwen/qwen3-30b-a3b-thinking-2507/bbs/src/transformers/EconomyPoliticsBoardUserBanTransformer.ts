import { IEconomyPoliticsBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardAdmin";
import { IEconomyPoliticsBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardUser";
import { IEconomyPoliticsBoardUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardUserBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EconomyPoliticsBoardAdminAtSummaryTransformer } from "./EconomyPoliticsBoardAdminAtSummaryTransformer";
import { EconomyPoliticsBoardUserAtSummaryTransformer } from "./EconomyPoliticsBoardUserAtSummaryTransformer";

export namespace EconomyPoliticsBoardUserBanTransformer {
  export type Payload = Prisma.economy_politics_board_user_bansGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        reason: true,
        start_at: true,
        expire_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        bannedUser: EconomyPoliticsBoardUserAtSummaryTransformer.select(),
        admin: EconomyPoliticsBoardAdminAtSummaryTransformer.select(),
      },
    } satisfies Prisma.economy_politics_board_user_bansFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEconomyPoliticsBoardUserBan> {
    return {
      id: input.id,
      reason: input.reason,
      start_at: input.start_at.toISOString(),
      expire_at: input.expire_at?.toISOString() ?? null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
      bannedUser: await EconomyPoliticsBoardUserAtSummaryTransformer.transform(
        input.bannedUser,
      ),
      admin: await EconomyPoliticsBoardAdminAtSummaryTransformer.transform(
        input.admin,
      ),
    };
  }
}
