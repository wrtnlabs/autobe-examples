import { IDiscussionBoardCommentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardCommentSnapshotTransformer {
  export type Payload = Prisma.discussion_board_comment_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        content: true,
        discussion_board_article_id: true,
        discussion_board_member_id: true,
        comment_created_at: true,
        comment_updated_at: true,
        snapshot_created_at: true,
        comment: {
          select: {
            id: true,
          },
        } satisfies Prisma.discussion_board_commentsFindManyArgs,
      },
    } satisfies Prisma.discussion_board_comment_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardCommentSnapshot> {
    return {
      id: input.id,
      discussion_board_comment_id: input.comment.id,
      content: input.content,
      discussion_board_article_id: input.discussion_board_article_id,
      discussion_board_member_id: input.discussion_board_member_id,
      comment_created_at: input.comment_created_at.toISOString(),
      comment_updated_at: input.comment_updated_at.toISOString(),
      snapshot_created_at: input.snapshot_created_at.toISOString(),
    };
  }
}
