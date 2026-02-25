import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import { IDiscussionBoardCommentFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentFlag";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { DiscussionBoardAdminAtSummaryTransformer } from "./DiscussionBoardAdminAtSummaryTransformer";
import { DiscussionBoardCommentAtSummaryTransformer } from "./DiscussionBoardCommentAtSummaryTransformer";
import { DiscussionBoardUserAtSummaryTransformer } from "./DiscussionBoardUserAtSummaryTransformer";

export namespace DiscussionBoardCommentFlagTransformer {
  export type Payload = Prisma.discussion_board_comment_flagsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        flag_reason: true,
        flag_type: true,
        status: true,
        resolution_notes: true,
        created_at: true,
        reviewed_at: true,
        resolved_at: true,
        user: DiscussionBoardUserAtSummaryTransformer.select(),
        comment: DiscussionBoardCommentAtSummaryTransformer.select(),
        reviewer: DiscussionBoardAdminAtSummaryTransformer.select(),
      },
    } satisfies Prisma.discussion_board_comment_flagsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardCommentFlag> {
    return {
      id: input.id,
      flag_reason: input.flag_reason,
      flag_type: input.flag_type,
      status: input.status,
      resolution_notes: input.resolution_notes ?? null,
      created_at: input.created_at.toISOString(),
      reviewed_at: input.reviewed_at?.toISOString() ?? null,
      resolved_at: input.resolved_at?.toISOString() ?? null,
      user: await DiscussionBoardUserAtSummaryTransformer.transform(input.user),
      comment: await DiscussionBoardCommentAtSummaryTransformer.transform(
        input.comment,
      ),
      reviewer: input.reviewer
        ? await DiscussionBoardAdminAtSummaryTransformer.transform(
            input.reviewer,
          )
        : null,
    };
  }
}
