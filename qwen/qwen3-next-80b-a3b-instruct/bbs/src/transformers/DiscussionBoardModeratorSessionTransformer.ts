import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IDiscussionBoardModeratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModeratorSession";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardModeratorSessionTransformer {
  export type Payload = Prisma.discussion_board_moderator_sessionsGetPayload<
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
        expired_at: true,
        moderator: {
          select: {
            id: true,
          },
        },
      },
    } satisfies Prisma.discussion_board_moderator_sessionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardModeratorSession> {
    return {
      moderatorId: input.moderator.id,
      sessionId: input.id,
      expiresAt: input.expired_at
        ? input.expired_at.toISOString()
        : new Date("2300-01-01").toISOString(),
      isActive: undefined,
    };
  }
}
