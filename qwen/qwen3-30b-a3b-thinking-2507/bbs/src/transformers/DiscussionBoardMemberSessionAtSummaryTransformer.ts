import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IDiscussionBoardMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberSession";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardMemberSessionAtSummaryTransformer {
  export type Payload = Prisma.discussion_board_member_sessionsGetPayload<
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
        member: true,
      },
    } satisfies Prisma.discussion_board_member_sessionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardMemberSession.ISummary> {
    const expiresAt = input.expired_at ? input.expired_at.toISOString() : null;
    const status = input.expired_at
      ? new Date(input.expired_at) <= new Date()
        ? "expired"
        : "active"
      : "active";
    return {
      id: input.id,
      deviceFingerprint: `${input.ip}|${input.href}|${input.referrer}`,
      expiresAt: expiresAt as string,
      lastActivityAt: input.created_at.toISOString(),
      status: status,
    };
  }
}
