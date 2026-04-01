import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { IRedditLikeVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeVote";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditLikeMemberAtSummaryTransformer } from "./RedditLikeMemberAtSummaryTransformer";

export namespace RedditLikeVoteTransformer {
  export type Payload = Prisma.reddit_like_votesGetPayload<
    ReturnType<typeof select>
  >;
  export async function transform(input: Payload): Promise<IRedditLikeVote> {
    return {
      id: input.id,
      member: await RedditLikeMemberAtSummaryTransformer.transform(
        input.member,
      ),
      vote_type: input.vote_type as "upvote" | "downvote",
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    };
  }
  export function select() {
    return {
      select: {
        id: true,
        member: RedditLikeMemberAtSummaryTransformer.select(),
        vote_type: true,
        created_at: true,
        updated_at: true,
      },
    } satisfies Prisma.reddit_like_votesFindManyArgs;
  }
}
