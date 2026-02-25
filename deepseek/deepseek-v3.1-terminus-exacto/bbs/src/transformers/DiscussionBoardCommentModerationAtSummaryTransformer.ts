import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardCommentModeration } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentModeration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { DiscussionBoardAdminAtSummaryTransformer } from "./DiscussionBoardAdminAtSummaryTransformer";

export namespace DiscussionBoardCommentModerationAtSummaryTransformer {
  /**
   * Prisma payload type containing all selected fields from discussion_board_comment_moderations
   */
  export type Payload = Prisma.discussion_board_comment_moderationsGetPayload<
    ReturnType<typeof select>
  >;
  /**
   * Selects the necessary fields from discussion_board_comment_moderations for building the summary DTO
   */
  export function select() {
    return {
      select: {
        id: true,
        action_type: true,
        reason: true,
        status: true,
        created_at: true,
        updated_at: true,
        comment: {
          select: {
            id: true,
          },
        } satisfies Prisma.discussion_board_commentsFindManyArgs,
        admin: DiscussionBoardAdminAtSummaryTransformer.select(),
      },
    } satisfies Prisma.discussion_board_comment_moderationsFindManyArgs;
  }
  /**
   * Transforms Prisma payload data into IDiscussionBoardCommentModeration.ISummary DTO
   */
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardCommentModeration.ISummary> {
    return {
      id: input.id,
      action_type: input.action_type,
      reason: input.reason,
      status: input.status,
      created_at: toISOStringSafe(input.created_at),
      admin: await DiscussionBoardAdminAtSummaryTransformer.transform(
        input.admin,
      ),
    };
  }
}
