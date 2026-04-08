import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditLikeCommentAtSummaryTransformer } from "./RedditLikeCommentAtSummaryTransformer";
import { RedditLikeMemberAtSummaryTransformer } from "./RedditLikeMemberAtSummaryTransformer";
import { RedditLikePostAtSummaryTransformer } from "./RedditLikePostAtSummaryTransformer";

export namespace RedditLikeCommentTransformer {
  export type Payload = Prisma.reddit_like_commentsGetPayload<
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
        post: RedditLikePostAtSummaryTransformer.select(),
        member: RedditLikeMemberAtSummaryTransformer.select(),
        parent: RedditLikeCommentAtSummaryTransformer.select(),
        votes: {
          select: {
            id: true,
            vote_type: true,
            deleted_at: true,
          },
        } satisfies Prisma.reddit_like_votesFindManyArgs,
        replies: true,
        reports: true,
      },
    };
  }
  export async function transform(input: Payload): Promise<IRedditLikeComment> {
    return {
      id: input.id,
      content: input.content,
      author: await RedditLikeMemberAtSummaryTransformer.transform(
        input.member,
      ),
      parent: input.parent
        ? await RedditLikeCommentAtSummaryTransformer.transform(input.parent)
        : null,
      post: await RedditLikePostAtSummaryTransformer.transform(input.post),
      vote_score: input.votes
        .filter((v) => v.deleted_at === null)
        .reduce((sum, v) => sum + (v.vote_type === "upvote" ? 1 : -1), 0),
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
    } satisfies IRedditLikeComment;
  }
}
