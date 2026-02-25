import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardContentModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentModerationLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { DiscussionBoardAdminAtSummaryTransformer } from "./DiscussionBoardAdminAtSummaryTransformer";

export namespace DiscussionBoardContentModerationLogTransformer {
  export type Payload =
    Prisma.discussion_board_content_moderation_logsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        action_type: true,
        target_content_type: true,
        target_content_id: true,
        reason: true,
        created_at: true,
        updated_at: true,
        admin: DiscussionBoardAdminAtSummaryTransformer.select(),
      },
    } satisfies Prisma.discussion_board_content_moderation_logsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardContentModerationLog> {
    return {
      id: input.id,
      action_type: input.action_type,
      target_content_type: input.target_content_type,
      target_content_id: input.target_content_id,
      reason: input.reason ?? null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      admin: await DiscussionBoardAdminAtSummaryTransformer.transform(
        input.admin,
      ),
    };
  }
}
