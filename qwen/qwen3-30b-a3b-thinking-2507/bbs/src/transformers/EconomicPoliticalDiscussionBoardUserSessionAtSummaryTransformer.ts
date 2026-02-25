import { IEconomicPoliticalDiscussionBoardUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardUserSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EconomicPoliticalDiscussionBoardUserSessionAtSummaryTransformer {
  export type Payload =
    Prisma.economic_political_discussion_board_user_sessionsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        created_at: true,
        expired_at: true,
        ip: true,
        href: true,
      },
    } satisfies Prisma.economic_political_discussion_board_user_sessionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEconomicPoliticalDiscussionBoardUserSession.ISummary> {
    return {
      id: input.id,
      created_at: toISOStringSafe(input.created_at),
      expired_at: toISOStringSafe(input.expired_at),
      ip: input.ip ?? null,
      href: input.href ?? null,
    };
  }
}
