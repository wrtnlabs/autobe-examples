import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IDiscussionBoardMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberSession";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardMemberSessionTransformer {
  export type Payload = Prisma.discussion_board_member_sessionsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        ip: true,
        created_at: true,
        expired_at: true,
        href: true,
        referrer: true,
        member: true,
      },
    } satisfies Prisma.discussion_board_member_sessionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardMemberSession> {
    return {
      id: input.id,
      ip: input.ip,
      createdAt: input.created_at.toISOString(),
      expiresAt: input.expired_at
        ? input.expired_at.toISOString()
        : new Date("2300-01-01").toISOString(),
      userAgent: "",
    };
  }
}
