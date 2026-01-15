import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IDiscussionBoardAuthenticationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuthenticationLog";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardAuthenticationLogTransformer {
  export type Payload = Prisma.discussion_board_authentication_logsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        actor_type: true,
        ip: true,
        href: true,
        referrer: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        expired_at: true,
        citizen: true,
        moderator: true,
      },
    } satisfies Prisma.discussion_board_authentication_logsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardAuthenticationLog> {
    return {
      id: input.id,
      user_id: input.actor_type,
      ip_address: input.ip,
      user_agent: input.href,
      authentication_method: input.actor_type,
      authentication_result: "success",
      created_at: input.created_at.toISOString(),
    };
  }
}
