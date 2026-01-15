import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IDiscussionBoardAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminSession";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardAdminSessionAtSummaryTransformer {
  export type Payload = Prisma.discussion_board_admin_sessionsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        created_at: true,
        expired_at: true,
        ip: true,
        admin: { select: { device_type: true } },
        href: true,
        referrer: true,
      },
    } satisfies Prisma.discussion_board_admin_sessionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardAdminSession.ISummary> {
    return {
      id: input.id,
      created_at: toISOStringSafe(input.created_at),
      expired: input.expired_at
        ? new Date(input.expired_at) < new Date()
        : false,
      device_type: input.admin.device_type,
      ip_address: input.ip,
    };
  }
}
