import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { IRedditCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostVote";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditCommunityMemberAtSummaryTransformer } from "./RedditCommunityMemberAtSummaryTransformer";
import { RedditCommunityPostAtSummaryTransformer } from "./RedditCommunityPostAtSummaryTransformer";

export namespace RedditCommunityPostVoteTransformer {
  export type Payload = Prisma.reddit_community_post_votesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        value: true,
        created_at: true,
        updated_at: true,
        member: RedditCommunityMemberAtSummaryTransformer.select(),
        post: RedditCommunityPostAtSummaryTransformer.select(),
      },
    } satisfies Prisma.reddit_community_post_votesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCommunityPostVote> {
    return {
      id: input.id,
      value: input.value,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      member: await RedditCommunityMemberAtSummaryTransformer.transform(
        input.member,
      ),
      post: await RedditCommunityPostAtSummaryTransformer.transform(input.post),
    } satisfies IRedditCommunityPostVote;
  }
}
