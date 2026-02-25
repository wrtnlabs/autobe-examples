import { IDiscussionBoardAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuditLog";
import { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { DiscussionBoardRegisteredUserAtSummaryTransformer } from "./DiscussionBoardRegisteredUserAtSummaryTransformer";

export namespace DiscussionBoardAuditLogTransformer {
  export type Payload = Prisma.discussion_board_audit_logsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        event_type: true,
        event_description: true,
        actor: DiscussionBoardRegisteredUserAtSummaryTransformer.select(),
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    } satisfies Prisma.discussion_board_audit_logsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardAuditLog> {
    return {
      id: input.id,
      eventType: input.event_type,
      eventDescription: input.event_description,
      actorId: input.actor?.id ?? null,
      actor: input.actor
        ? await DiscussionBoardRegisteredUserAtSummaryTransformer.transform(
            input.actor,
          )
        : null,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at ? input.deleted_at.toISOString() : null,
    } satisfies IDiscussionBoardAuditLog;
  }
}
