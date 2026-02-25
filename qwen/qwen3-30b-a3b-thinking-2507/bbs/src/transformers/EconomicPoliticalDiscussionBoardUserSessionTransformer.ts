import { IEconomicPoliticalDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardUser";
import { IEconomicPoliticalDiscussionBoardUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardUserSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EconomicPoliticalDiscussionBoardUserAtSummaryTransformer } from "./EconomicPoliticalDiscussionBoardUserAtSummaryTransformer";

export namespace EconomicPoliticalDiscussionBoardUserSessionTransformer {
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
        referrer: true,
        user: EconomicPoliticalDiscussionBoardUserAtSummaryTransformer.select(),
      },
    } satisfies Prisma.economic_political_discussion_board_user_sessionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEconomicPoliticalDiscussionBoardUserSession> {
    return {
      id: input.id,
      created_at: input.created_at.toISOString(),
      expired_at: input.expired_at.toISOString(),
      ip: input.ip ?? null,
      href: input.href ?? null,
      referrer: input.referrer ?? null,
      user: await EconomicPoliticalDiscussionBoardUserAtSummaryTransformer.transform(
        input.user,
      ),
    };
  }
}
