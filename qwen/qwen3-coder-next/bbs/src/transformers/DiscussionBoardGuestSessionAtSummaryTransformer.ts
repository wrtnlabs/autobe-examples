import { IDiscussionBoardGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuestSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardGuestSessionAtSummaryTransformer {
  export type Payload = Prisma.discussion_board_guest_sessionsGetPayload<
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
        guest: {
          select: {
            id: true,
          },
        },
      },
    } satisfies Prisma.discussion_board_guest_sessionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardGuestSession.ISummary> {
    return {
      id: input.id,
      href: input.href,
      created_at: toISOStringSafe(input.created_at),
      expired_at: toISOStringSafe(input.expired_at),
    };
  }
}
