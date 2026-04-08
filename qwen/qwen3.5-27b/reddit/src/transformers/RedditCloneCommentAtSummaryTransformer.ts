import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditClonePostAtSummaryTransformer } from "./RedditClonePostAtSummaryTransformer";
import { RedditCloneUserProfileAtSummaryTransformer } from "./RedditCloneUserProfileAtSummaryTransformer";

export namespace RedditCloneCommentAtSummaryTransformer {
  export type Payload = Prisma.reddit_clone_commentsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        content: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        userProfile: RedditCloneUserProfileAtSummaryTransformer.select(),
        post: RedditClonePostAtSummaryTransformer.select(),
        parent_comment_id: true,
        parentComment: undefined, // DO NOT select recursive relation
        replies: {
          select: { id: true },
        } satisfies Prisma.reddit_clone_commentsFindManyArgs,
        votes: {
          select: { vote_type: true },
        } satisfies Prisma.reddit_clone_comment_votesFindManyArgs,
        snapshots: undefined,
        commentReports: undefined,
        generalReports: undefined,
      },
    } satisfies Prisma.reddit_clone_commentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
    cache: VariadicSingleton<
      Promise<IRedditCloneComment.ISummary>,
      [string]
    > = createParentCache(),
  ): Promise<IRedditCloneComment.ISummary> {
    const vote_score = input.votes.reduce(
      (sum, v) => sum + (v.vote_type === "upvote" ? 1 : -1),
      0,
    );
    const reply_count = input.replies.length;
    const parentComment = input.parent_comment_id
      ? await cache.get(input.parent_comment_id)
      : null;
    return {
      id: input.id,
      content: input.content,
      author: await RedditCloneUserProfileAtSummaryTransformer.transform(
        input.userProfile,
      ),
      post: await RedditClonePostAtSummaryTransformer.transform(input.post),
      parentComment: parentComment,
      vote_score: vote_score,
      reply_count: reply_count,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
  export async function transformAll(
    inputs: Payload[],
  ): Promise<IRedditCloneComment.ISummary[]> {
    const cache = createParentCache();
    return await ArrayUtil.asyncMap(inputs, (x) => transform(x, cache));
  }
  function createParentCache() {
    const cache = new VariadicSingleton(
      async (id: string): Promise<IRedditCloneComment.ISummary> => {
        const record =
          await MyGlobal.prisma.reddit_clone_comments.findFirstOrThrow({
            ...select(),
            where: { id },
          });
        return transform(record, cache);
      },
    );
    return cache;
  }
}
