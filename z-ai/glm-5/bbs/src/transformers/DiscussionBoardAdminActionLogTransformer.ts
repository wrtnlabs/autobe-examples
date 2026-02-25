import { IDiscussionBoardAdminActionLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminActionLog";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { DiscussionBoardUserAtSummaryTransformer } from "./DiscussionBoardUserAtSummaryTransformer";

export namespace DiscussionBoardAdminActionLogTransformer {
  export type Payload = Prisma.discussion_board_admin_action_logsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        action_type: true,
        target_type: true,
        target_id: true,
        target_title: true,
        reason: true,
        ip: true,
        user_agent: true,
        created_at: true,
        administrator: DiscussionBoardUserAtSummaryTransformer.select(),
        originalAuthor: DiscussionBoardUserAtSummaryTransformer.select(),
      },
    } satisfies Prisma.discussion_board_admin_action_logsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardAdminActionLog> {
    return {
      id: input.id,
      administrator: await DiscussionBoardUserAtSummaryTransformer.transform(
        input.administrator,
      ),
      originalAuthor:
        input.originalAuthor !== null
          ? await DiscussionBoardUserAtSummaryTransformer.transform(
              input.originalAuthor,
            )
          : null,
      actionType: input.action_type,
      targetType: input.target_type,
      targetId: input.target_id,
      targetTitle: input.target_title,
      reason: input.reason,
      ip: input.ip,
      userAgent: input.user_agent,
      createdAt: input.created_at.toISOString(),
    };
  }
}
