import { IEconomyPoliticsBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardUser";
import { IEconomyPoliticsBoardUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardUserSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EconomyPoliticsBoardUserAtSummaryTransformer } from "./EconomyPoliticsBoardUserAtSummaryTransformer";

export namespace EconomyPoliticsBoardUserSessionAtSummaryTransformer {
  export type Payload = Prisma.economy_politics_board_user_sessionsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        ip: true,
        href: true,
        referrer: true,
        created_at: true,
        updated_at: true,
        expired_at: true,
        user: EconomyPoliticsBoardUserAtSummaryTransformer.select(),
      },
    } satisfies Prisma.economy_politics_board_user_sessionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEconomyPoliticsBoardUserSession.ISummary> {
    return {
      id: input.id,
      created_at: input.created_at.toISOString(),
      expired_at: input.expired_at.toISOString(),
      user: await EconomyPoliticsBoardUserAtSummaryTransformer.transform(
        input.user,
      ),
    };
  }
}
