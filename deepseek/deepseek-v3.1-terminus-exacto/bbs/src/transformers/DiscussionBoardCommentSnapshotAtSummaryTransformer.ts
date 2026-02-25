import { IDiscussionBoardCommentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentSnapshot";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { DiscussionBoardUserAtSummaryTransformer } from "./DiscussionBoardUserAtSummaryTransformer";

export namespace DiscussionBoardCommentSnapshotAtSummaryTransformer {
  export type Payload = Prisma.discussion_board_comment_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
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
        comment: {
          select: { id: true },
        } satisfies Prisma.discussion_board_commentsFindManyArgs,
        user: DiscussionBoardUserAtSummaryTransformer.select(),
      },
    } satisfies Prisma.discussion_board_comment_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardCommentSnapshot.ISummary> {
    return {
      id: input.id,
      version_number: input.version_number,
      snapshot_reason: input.snapshot_reason ?? null,
      created_at: input.created_at.toISOString(),
      author: await DiscussionBoardUserAtSummaryTransformer.transform(
        input.user,
      ),
    };
  }
}
