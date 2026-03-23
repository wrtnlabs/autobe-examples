import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneCommentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommentSnapshot";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditCloneMemberAtSummaryTransformer } from "./RedditCloneMemberAtSummaryTransformer";

export namespace RedditCloneCommentSnapshotAtSummaryTransformer {
  export type Payload = Prisma.reddit_clone_comment_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        content: true,
        vote_score: true,
        snapshot_created_at: true,
        comment_created_at: true,
        comment_updated_at: true,
        comment_deleted_at: true,
        author: RedditCloneMemberAtSummaryTransformer.select(),
      },
    } satisfies Prisma.reddit_clone_comment_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCloneCommentSnapshot.ISummary> {
    return {
      id: input.id,
      content: input.content,
      vote_score: input.vote_score,
      snapshot_created_at: input.snapshot_created_at.toISOString(),
      comment_created_at: input.comment_created_at.toISOString(),
      comment_updated_at: input.comment_updated_at.toISOString(),
      comment_deleted_at: input.comment_deleted_at?.toISOString() ?? null,
      author: await RedditCloneMemberAtSummaryTransformer.transform(
        input.author,
      ),
    };
  }
}
