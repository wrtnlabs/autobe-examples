import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunity";
import { IRedditMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditMember";
import { IRedditPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPostText";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditCommunityAtSummaryTransformer } from "./RedditCommunityAtSummaryTransformer";
import { RedditMemberAtSummaryTransformer } from "./RedditMemberAtSummaryTransformer";

export namespace RedditPostTextAtSummaryTransformer {
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
        author: RedditMemberAtSummaryTransformer.select(),
        community: RedditCommunityAtSummaryTransformer.select(),
        link: {} satisfies Prisma.reddit_post_linksFindManyArgs,
        images: {} satisfies Prisma.reddit_post_imagesFindManyArgs,
        votes: {} satisfies Prisma.reddit_post_votesFindManyArgs,
        text: {} satisfies Prisma.reddit_post_textsFindManyArgs,
        comments: {} satisfies Prisma.reddit_commentsFindManyArgs,
      },
    } satisfies Prisma.reddit_postsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditPostText.ISummary> {
    return {
      id: input.id,
      title: input.title,
      post_type: input.post_type,
      author: await RedditMemberAtSummaryTransformer.transform(input.author),
      community: await RedditCommunityAtSummaryTransformer.transform(
        input.community,
      ),
      vote_count: input.votes.length,
      created_at: input.created_at.toISOString(),
    };
  }
}
