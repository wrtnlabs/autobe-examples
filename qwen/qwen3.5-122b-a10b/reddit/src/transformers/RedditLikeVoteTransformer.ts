import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import { IRedditLikeVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeVote";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditLikeCommentAtSummaryTransformer } from "./RedditLikeCommentAtSummaryTransformer";
import { RedditLikeMemberAtSummaryTransformer } from "./RedditLikeMemberAtSummaryTransformer";
import { RedditLikePostAtSummaryTransformer } from "./RedditLikePostAtSummaryTransformer";

export namespace RedditLikeVoteTransformer {
  export type Payload = Prisma.reddit_like_votesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        vote_type: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        member: RedditLikeMemberAtSummaryTransformer.select(),
        post: RedditLikePostAtSummaryTransformer.select(),
        comment: RedditLikeCommentAtSummaryTransformer.select(),
      },
    } satisfies Prisma.reddit_like_votesFindManyArgs;
  }
  export async function transform(input: Payload): Promise<IRedditLikeVote> {
    return {
      id: input.id,
      vote_type: input.vote_type,
      author: await RedditLikeMemberAtSummaryTransformer.transform(
        input.member,
      ),
      post: input.post
        ? await RedditLikePostAtSummaryTransformer.transform(input.post)
        : null,
      comment: input.comment
        ? await RedditLikeCommentAtSummaryTransformer.transform(input.comment)
        : null,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
    } satisfies IRedditLikeVote;
  }
}
