import { IDiscussionBoardSuperAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdminSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardSuperAdminSessionAtSummaryTransformer {
  export type Payload = Prisma.discussion_board_super_admin_sessionsGetPayload<
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
        expired_at: true,
        created_at: true,
        updated_at: true,
        superAdmin: {
          select: {
            id: true,
          },
        } satisfies Prisma.discussion_board_super_adminsFindManyArgs,
      },
    } satisfies Prisma.discussion_board_super_admin_sessionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardSuperAdminSession.ISummary> {
    return {
      id: input.id,
      ip: input.ip,
      expired_at: input.expired_at.toISOString(),
      created_at: input.created_at.toISOString(),
    };
  }
}
