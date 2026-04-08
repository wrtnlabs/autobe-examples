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
import { RedditCloneCommentAtSummaryTransformer } from "./RedditCloneCommentAtSummaryTransformer";
import { RedditClonePostAtSummaryTransformer } from "./RedditClonePostAtSummaryTransformer";
import { RedditCloneUserProfileAtSummaryTransformer } from "./RedditCloneUserProfileAtSummaryTransformer";

export namespace RedditCloneCommentTransformer {
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
        parentComment: RedditCloneCommentAtSummaryTransformer.select(),
        votes: {
          select: { vote_type: true },
        } satisfies Prisma.reddit_clone_comment_votesFindManyArgs,
        replies: true,
      },
    } satisfies Prisma.reddit_clone_commentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCloneComment> {
    const voteScore = input.votes.reduce((sum, vote) => {
      if (vote.vote_type === "upvote") return sum + 1;
      if (vote.vote_type === "downvote") return sum - 1;
      return sum;
    }, 0);
    return {
      id: input.id,
      content: input.content,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
      author: await RedditCloneUserProfileAtSummaryTransformer.transform(
        input.userProfile,
      ),
      post: await RedditClonePostAtSummaryTransformer.transform(input.post),
      parentComment: input.parentComment
        ? await RedditCloneCommentAtSummaryTransformer.transform(
            input.parentComment,
          )
        : null,
      voteScore,
      replyCount: input.replies.length,
    };
  }
}
