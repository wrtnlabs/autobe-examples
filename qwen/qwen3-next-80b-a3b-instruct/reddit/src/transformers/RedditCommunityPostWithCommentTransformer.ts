import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityCommentFull } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentFull";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityPostWithComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostWithComment";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditCommunityCommentFullTransformer } from "./RedditCommunityCommentFullTransformer";
import { RedditCommunityCommunityAtSummaryTransformer } from "./RedditCommunityCommunityAtSummaryTransformer";
import { RedditCommunityMemberAtSummaryTransformer } from "./RedditCommunityMemberAtSummaryTransformer";

export namespace RedditCommunityPostWithCommentTransformer {
  export type Payload = Prisma.reddit_community_postsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        title: true,
        content: true,
        url: true,
        image_url: true,
        vote_score: true,
        created_at: true,
        updated_at: true,
        author: RedditCommunityMemberAtSummaryTransformer.select(),
        community: RedditCommunityCommunityAtSummaryTransformer.select(),
        comments: RedditCommunityCommentFullTransformer.select(),
        comment_count: true,
        votes: true,
      },
    } satisfies Prisma.reddit_community_postsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCommunityPostWithComment> {
    return {
      id: input.id,
      title: input.title,
      content: input.content ?? undefined,
      url: input.url ?? undefined,
      image_url: input.image_url ?? undefined,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      vote_score: input.vote_score,
      author: await RedditCommunityMemberAtSummaryTransformer.transform(
        input.author,
      ),
      community: await RedditCommunityCommunityAtSummaryTransformer.transform(
        input.community,
      ),
      comment_tree: await ArrayUtil.asyncMap(
        input.comments,
        RedditCommunityCommentFullTransformer.transform,
      ),
    };
  }
}
