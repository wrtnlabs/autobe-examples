import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardUserAtStatusTransformer {
  export type Payload = Prisma.discussion_board_citizen_sessionsGetPayload<
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
        citizen: true,
      },
    } satisfies Prisma.discussion_board_citizen_sessionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardUser.IStatus> {
    return {
      is_active:
        input.expired_at !== null ? input.expired_at > new Date() : false,
      expires_at:
        input.expired_at !== null
          ? input.expired_at.toISOString()
          : new Date("2300-01-01").toISOString(),
    };
  }
}
