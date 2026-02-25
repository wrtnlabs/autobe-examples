import { IDiscussionBoardSessionStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSessionStatus";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IDiscussionBoardUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { DiscussionBoardUserAtSummaryTransformer } from "./DiscussionBoardUserAtSummaryTransformer";

export namespace DiscussionBoardUserSessionAtSummaryTransformer {
  export type Payload = Prisma.discussion_board_user_sessionsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        ip: true,
        href: true,
        referrer: true,
        user_agent: true,
        created_at: true,
        expired_at: true,
        user: DiscussionBoardUserAtSummaryTransformer.select(),
      },
    } satisfies Prisma.discussion_board_user_sessionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardUserSession.ISummary> {
    return {
      id: input.id,
      user: await DiscussionBoardUserAtSummaryTransformer.transform(input.user),
      ip: input.ip,
      href: input.href,
      referrer: input.referrer ?? null,
      user_agent: input.user_agent ?? null,
      created_at: input.created_at.toISOString(),
      expired_at: input.expired_at.toISOString(),
      status: input.expired_at > new Date() ? "active" : "expired",
    };
  }
}
