import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import { IRedditLikePostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostVote";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditLikeMemberAtSummaryTransformer } from "./RedditLikeMemberAtSummaryTransformer";
import { RedditLikePostAtSummaryTransformer } from "./RedditLikePostAtSummaryTransformer";

export namespace RedditLikePostVoteTransformer {
  export type Payload = Prisma.reddit_like_post_votesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        value: true,
        created_at: true,
        voter: RedditLikeMemberAtSummaryTransformer.select(),
        post: RedditLikePostAtSummaryTransformer.select(),
      },
    } satisfies Prisma.reddit_like_post_votesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditLikePostVote> {
    return {
      id: input.id,
      value: typia.assert<-1 | 0 | 1>(input.value),
      created_at: toISOStringSafe(input.created_at),
      voter: await RedditLikeMemberAtSummaryTransformer.transform(input.voter),
      post: await RedditLikePostAtSummaryTransformer.transform(input.post),
    };
  }
}
