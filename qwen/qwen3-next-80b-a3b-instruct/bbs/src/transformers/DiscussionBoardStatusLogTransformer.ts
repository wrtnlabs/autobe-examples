import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IDiscussionBoardStatusLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardStatusLog";
import { IStatusLogMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/IStatusLogMetadata";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardStatusLogTransformer {
  export type Payload = Prisma.discussion_board_status_logsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        status_type: true,
        message: true,
        context: true,
        created_at: true,
      },
    } satisfies Prisma.discussion_board_status_logsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardStatusLog> {
    // Extract target information from message field as per system format
    // Format: "entity_type:entity_id,actor_type:actor_id,status_after"
    // This is assumed standard based on DTO structure and field availability
    const messageParts = input.message.split(",");
    if (messageParts.length < 3) {
      throw new Error(`Invalid message format in status log: ${input.message}`);
    }
    const entityTypeAndId = messageParts[0].split(":");
    const actorTypeAndId = messageParts[1].split(":");
    const statusPart = messageParts[2];
    if (entityTypeAndId.length !== 2 || actorTypeAndId.length !== 2) {
      throw new Error(`Invalid message format in status log: ${input.message}`);
    }
    return {
      id: input.id,
      status_type: input.status_type,
      target_entity_type: entityTypeAndId[0],
      target_entity_id: entityTypeAndId[1],
      timestamp: input.created_at.toISOString(),
      actor_id: actorTypeAndId[1],
      actor_type: actorTypeAndId[0],
      status_after: statusPart,
      metadata: input.context ?? undefined,
    };
  }
}
