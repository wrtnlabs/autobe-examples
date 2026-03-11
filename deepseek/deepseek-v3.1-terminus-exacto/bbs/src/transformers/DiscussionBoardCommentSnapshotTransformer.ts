import { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import { IDiscussionBoardCommentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentSnapshot";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { DiscussionBoardCommentAtSummaryTransformer } from "./DiscussionBoardCommentAtSummaryTransformer";

export namespace DiscussionBoardCommentSnapshotTransformer {
  export type Payload = Prisma.discussion_board_comment_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        content: true,
        edit_reason: true,
        created_at: true,
        comment: DiscussionBoardCommentAtSummaryTransformer.select(),
      },
    } satisfies Prisma.discussion_board_comment_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardCommentSnapshot> {
    return {
      id: input.id,
      content: input.content,
      edit_reason: input.edit_reason ?? null,
      created_at: input.created_at.toISOString(),
      comment: await DiscussionBoardCommentAtSummaryTransformer.transform(
        input.comment,
      ),
    };
  }
}
