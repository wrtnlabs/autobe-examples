import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import { IRedditCloneCommentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommentSnapshot";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditCloneCommentAtSummaryTransformer } from "./RedditCloneCommentAtSummaryTransformer";
import { RedditCloneMemberAtSummaryTransformer } from "./RedditCloneMemberAtSummaryTransformer";
import { RedditClonePostAtSummaryTransformer } from "./RedditClonePostAtSummaryTransformer";

export namespace RedditCloneCommentSnapshotTransformer {
  export type Payload = Prisma.reddit_clone_comment_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        content: true,
        vote_score: true,
        comment_created_at: true,
        comment_updated_at: true,
        comment_deleted_at: true,
        snapshot_created_at: true,
        comment: true,
        author: RedditCloneMemberAtSummaryTransformer.select(),
        post: RedditClonePostAtSummaryTransformer.select(),
        parentComment: RedditCloneCommentAtSummaryTransformer.select(),
      },
    } satisfies Prisma.reddit_clone_comment_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCloneCommentSnapshot> {
    return {
      id: input.id,
      content: input.content,
      vote_score: input.vote_score,
      comment_created_at: input.comment_created_at.toISOString(),
      comment_updated_at: input.comment_updated_at.toISOString(),
      comment_deleted_at: input.comment_deleted_at?.toISOString() ?? null,
      snapshot_created_at: input.snapshot_created_at.toISOString(),
      author: await RedditCloneMemberAtSummaryTransformer.transform(
        input.author,
      ),
      post: await RedditClonePostAtSummaryTransformer.transform(input.post),
      parentComment: input.parentComment
        ? await RedditCloneCommentAtSummaryTransformer.transform(
            input.parentComment,
          )
        : null,
    };
  }
}
