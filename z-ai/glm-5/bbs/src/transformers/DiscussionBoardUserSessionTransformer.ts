import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IDiscussionBoardUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { DiscussionBoardUserAtSummaryTransformer } from "./DiscussionBoardUserAtSummaryTransformer";

export namespace DiscussionBoardUserSessionTransformer {
  export type Payload = Prisma.discussion_board_user_sessionsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        access_token: true,
        refresh_token: true,
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
  ): Promise<IDiscussionBoardUserSession> {
    return {
      id: input.id,
      accessToken: input.access_token,
      refreshToken: input.refresh_token,
      ip: input.ip,
      href: input.href,
      referrer: input.referrer,
      userAgent: input.user_agent,
      createdAt: input.created_at.toISOString(),
      expiredAt: input.expired_at.toISOString(),
      user: await DiscussionBoardUserAtSummaryTransformer.transform(input.user),
    };
  }
}
