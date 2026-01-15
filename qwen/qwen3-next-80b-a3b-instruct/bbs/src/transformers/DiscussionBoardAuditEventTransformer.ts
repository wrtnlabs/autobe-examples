import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IDiscussionBoardAuditEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuditEvent";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardAuditEventTransformer {
  export type Payload = Prisma.discussion_board_audit_eventsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        event_type: true,
        action: true,
        description: true,
        ip_address: true,
        user_agent: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        citizen: true,
        moderator: true,
        article: true,
        comment: true,
        attachmentFile: true,
        attachmentImage: true,
        channel: true,
      },
    } satisfies Prisma.discussion_board_audit_eventsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardAuditEvent> {
    return {
      event_type: input.event_type,
      created_at: input.created_at.toISOString(),
    };
  }
}
