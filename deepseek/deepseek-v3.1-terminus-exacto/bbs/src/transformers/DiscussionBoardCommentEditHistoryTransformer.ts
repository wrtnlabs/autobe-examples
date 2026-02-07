import { IDiscussionBoardCommentEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentEditHistory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardCommentEditHistoryTransformer {
  export type Payload =
    Prisma.discussion_board_comment_edit_historiesGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        edit_sequence: true,
        original_content: true,
        edited_content: true,
        edit_reason: true,
        created_at: true,
      },
    } satisfies Prisma.discussion_board_comment_edit_historiesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardCommentEditHistory> {
    return {
      id: input.id,
      edit_sequence: input.edit_sequence,
      original_content: input.original_content,
      edited_content: input.edited_content,
      edit_reason: input.edit_reason ?? null,
      created_at: input.created_at.toISOString(),
    };
  }
}
