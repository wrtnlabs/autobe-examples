import { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import { IDiscussionBoardCommentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentSnapshot";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { DiscussionBoardCommentAtSummaryTransformer } from "./DiscussionBoardCommentAtSummaryTransformer";
import { DiscussionBoardUserAtSummaryTransformer } from "./DiscussionBoardUserAtSummaryTransformer";

export namespace DiscussionBoardCommentSnapshotTransformer {
  // 1. Payload type first
  export type Payload = Prisma.discussion_board_comment_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  // 2. select() function second
  export function select() {
    return {
      select: {
        id: true,
        version_number: true,
        snapshot_reason: true,
        created_at: true,
        comment_content: true,
        comment_created_at: true,
        comment_updated_at: true,
        comment_deleted_at: true,
        comment: DiscussionBoardCommentAtSummaryTransformer.select(),
        user: DiscussionBoardUserAtSummaryTransformer.select(),
      },
    } satisfies Prisma.discussion_board_comment_snapshotsFindManyArgs;
  }
  // 3. transform() function last
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardCommentSnapshot> {
    return {
      id: input.id,
      versionNumber: input.version_number,
      snapshotReason: input.snapshot_reason ?? undefined,
      createdAt: input.created_at.toISOString(),
      commentContent: input.comment_content,
      commentCreatedAt: input.comment_created_at.toISOString(),
      commentUpdatedAt: input.comment_updated_at.toISOString(),
      commentDeletedAt: input.comment_deleted_at?.toISOString() ?? null,
      comment: await DiscussionBoardCommentAtSummaryTransformer.transform(
        input.comment,
      ),
      user: await DiscussionBoardUserAtSummaryTransformer.transform(input.user),
    };
  }
}
