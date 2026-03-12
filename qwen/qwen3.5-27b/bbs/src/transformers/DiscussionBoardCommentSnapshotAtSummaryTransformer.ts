import { IDiscussionBoardCommentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentSnapshot";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardCommentSnapshotAtSummaryTransformer {
  export type Payload = Prisma.discussion_board_comment_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        content: true,
        created_at: true,
        updated_at: true,
        snapshot_at: true,
        comment: {
          select: {
            author: {
              select: {
                id: true,
                email: true,
                display_name: true,
                banned: true,
                created_at: true,
              },
            } satisfies Prisma.discussion_board_membersFindManyArgs,
          },
        } satisfies Prisma.discussion_board_commentsFindManyArgs,
      },
    } satisfies Prisma.discussion_board_comment_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardCommentSnapshot.ISummary> {
    return {
      id: input.id,
      content: input.content,
      author: {
        id: input.comment.author.id,
        email: input.comment.author.email,
        display_name: input.comment.author.display_name ?? null,
        banned: input.comment.author.banned,
        created_at: input.comment.author.created_at.toISOString(),
      },
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      snapshot_at: toISOStringSafe(input.snapshot_at),
    };
  }
}
