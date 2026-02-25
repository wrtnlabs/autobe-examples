import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardCommentFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentFlag";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { DiscussionBoardAdminAtSummaryTransformer } from "./DiscussionBoardAdminAtSummaryTransformer";
import { DiscussionBoardUserAtSummaryTransformer } from "./DiscussionBoardUserAtSummaryTransformer";

export namespace DiscussionBoardCommentFlagAtSummaryTransformer {
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
        comment: {
          select: { id: true },
        } satisfies Prisma.discussion_board_commentsFindManyArgs,
        reviewer: DiscussionBoardAdminAtSummaryTransformer.select(),
      },
    } satisfies Prisma.discussion_board_comment_flagsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardCommentFlag.ISummary> {
    return {
      id: input.id,
      flag_type: input.flag_type,
      status: input.status,
      user: await DiscussionBoardUserAtSummaryTransformer.transform(input.user),
      reviewer: input.reviewer
        ? await DiscussionBoardAdminAtSummaryTransformer.transform(
            input.reviewer,
          )
        : null,
      created_at: input.created_at.toISOString(),
    };
  }
}
