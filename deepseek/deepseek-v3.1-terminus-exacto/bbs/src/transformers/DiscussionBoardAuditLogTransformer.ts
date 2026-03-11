import { IDiscussionBoardAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuditLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardAuditLogTransformer {
  export type Payload = Prisma.discussion_board_audit_logsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        actor_type: true,
        actor_id: true,
        target_type: true,
        target_id: true,
        action_type: true,
        action_details: true,
        ip_address: true,
        user_agent: true,
        href: true,
        created_at: true,
        updated_at: true,
      },
    } satisfies Prisma.discussion_board_audit_logsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardAuditLog> {
    return {
      id: input.id,
      actor_type: input.actor_type,
      actor_id: input.actor_id,
      target_type: input.target_type,
      target_id: input.target_id,
      action_type: input.action_type,
      action_details: input.action_details ?? undefined,
      ip_address: input.ip_address ?? undefined,
      user_agent: input.user_agent ?? undefined,
      href: input.href ?? undefined,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    };
  }
}
