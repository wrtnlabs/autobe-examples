import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IDiscussionBoardActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardActivityLog";
import { IDiscussionBoardActivityLogMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardActivityLogMetadata";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardActivityLogTransformer {
  export type Payload = Prisma.discussion_board_activity_logsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        action_type: true,
        context: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        citizen: true,
        moderator: true,
      },
    } satisfies Prisma.discussion_board_activity_logsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardActivityLog> {
    const contextData = input.context ? JSON.parse(input.context) : {};
    return {
      id: input.id,
      actor_id: typia.assert(input.citizen?.id),
      action_type: input.action_type,
      target_type: contextData.target_type ?? undefined,
      target_id: contextData.target_id ?? undefined,
      description: contextData.description ?? undefined,
      metadata: contextData ?? undefined,
      created_at: toISOStringSafe(input.created_at),
      is_system_generated: contextData.is_system_generated ?? false,
    };
  }
}
