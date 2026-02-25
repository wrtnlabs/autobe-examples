import { IDiscussionBoardAdminActionLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminActionLog";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { DiscussionBoardUserAtSummaryTransformer } from "./DiscussionBoardUserAtSummaryTransformer";

export namespace DiscussionBoardAdminActionLogAtSummaryTransformer {
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
  ): Promise<IDiscussionBoardAdminActionLog.ISummary> {
    return {
      id: input.id,
      actionType: input.action_type,
      targetType: input.target_type,
      targetTitle: input.target_title,
      administrator: await DiscussionBoardUserAtSummaryTransformer.transform(
        input.administrator,
      ),
      originalAuthor: input.originalAuthor
        ? await DiscussionBoardUserAtSummaryTransformer.transform(
            input.originalAuthor,
          )
        : null,
      reason: input.reason,
      createdAt: input.created_at.toISOString(),
    };
  }
}
