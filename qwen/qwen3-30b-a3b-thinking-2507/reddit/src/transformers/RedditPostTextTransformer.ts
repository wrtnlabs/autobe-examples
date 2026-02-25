import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditComment";
import { IRedditCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunity";
import { IRedditMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditMember";
import { IRedditPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPostText";
import { IRedditPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPostVote";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditCommentAtSummaryTransformer } from "./RedditCommentAtSummaryTransformer";
import { RedditCommunityAtSummaryTransformer } from "./RedditCommunityAtSummaryTransformer";
import { RedditMemberAtSummaryTransformer } from "./RedditMemberAtSummaryTransformer";
import { RedditPostVoteAtSummaryTransformer } from "./RedditPostVoteAtSummaryTransformer";

export namespace RedditPostTextTransformer {
  export type Payload = Prisma.reddit_postsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        title: true,
        post_type: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        community: RedditCommunityAtSummaryTransformer.select(),
        author: RedditMemberAtSummaryTransformer.select(),
        votes: RedditPostVoteAtSummaryTransformer.select(),
        comments: RedditCommentAtSummaryTransformer.select(),
      },
    } satisfies Prisma.reddit_postsFindManyArgs;
  }
  export async function transform(input: Payload): Promise<IRedditPostText> {
    return {
      id: input.id,
      title: input.title,
      post_type: input.post_type,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
      community: await RedditCommunityAtSummaryTransformer.transform(
        input.community,
      ),
      author: await RedditMemberAtSummaryTransformer.transform(input.author),
      comments: await ArrayUtil.asyncMap(input.comments, (comment) =>
        RedditCommentAtSummaryTransformer.transform(comment),
      ),
      votes: await ArrayUtil.asyncMap(input.votes, (vote) =>
        RedditPostVoteAtSummaryTransformer.transform(vote),
      ),
      vote_score: input.votes
        ? input.votes.reduce(
            (
              sum: number,
              vote: {
                direction: string;
              },
            ) => sum + (vote.direction === "up" ? 1 : -1),
            0,
          )
        : 0,
    };
  }
}
