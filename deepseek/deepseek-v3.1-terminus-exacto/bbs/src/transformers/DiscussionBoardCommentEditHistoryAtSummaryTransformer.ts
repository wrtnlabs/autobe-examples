import { IDiscussionBoardCommentEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentEditHistory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardCommentEditHistoryAtSummaryTransformer {
  export type Payload =
    Prisma.discussion_board_comment_edit_historiesGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        edit_sequence: true,
        edit_reason: true,
        created_at: true,
      },
    } satisfies Prisma.discussion_board_comment_edit_historiesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardCommentEditHistory.ISummary> {
    return {
      id: input.id,
      edit_sequence: input.edit_sequence,
      edit_reason: input.edit_reason ?? undefined,
      created_at: input.created_at.toISOString(),
    };
  }
}
