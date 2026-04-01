import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityIcon";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { IRedditCommunityPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostImage";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditCommunityCommunityAtSummaryTransformer } from "./RedditCommunityCommunityAtSummaryTransformer";
import { RedditCommunityMemberAtSummaryTransformer } from "./RedditCommunityMemberAtSummaryTransformer";
import { RedditCommunityPostImageTransformer } from "./RedditCommunityPostImageTransformer";

export namespace RedditCommunityPostTransformer {
  export type Payload = Prisma.reddit_community_postsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        title: true,
        post_type: true,
        text_content: true,
        link_url: true,
        image_path: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        author: RedditCommunityMemberAtSummaryTransformer.select(),
        community: RedditCommunityCommunityAtSummaryTransformer.select(),
        images: RedditCommunityPostImageTransformer.select(),
        votes: {
          select: {
            direction: true,
          },
        } satisfies Prisma.reddit_community_post_votesFindManyArgs,
        comments: {
          select: {
            deleted_at: true,
          },
        } satisfies Prisma.reddit_community_commentsFindManyArgs,
      },
    } satisfies Prisma.reddit_community_postsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCommunityPost> {
    return {
      id: input.id,
      title: input.title,
      post_type: input.post_type,
      text_content: input.text_content ?? undefined,
      link_url: input.link_url ?? undefined,
      image_path: input.image_path ?? undefined,
      author: await RedditCommunityMemberAtSummaryTransformer.transform(
        input.author,
      ),
      community: await RedditCommunityCommunityAtSummaryTransformer.transform(
        input.community,
      ),
      images: await ArrayUtil.asyncMap(
        input.images,
        RedditCommunityPostImageTransformer.transform,
      ),
      vote_score: input.votes.reduce(
        (sum, vote) => sum + (vote.direction === "UPVOTE" ? 1 : -1),
        0,
      ) as number & tags.Type<"int32">,
      comments_count: input.comments.filter(
        (comment) => comment.deleted_at === null,
      ).length as number & tags.Type<"int32">,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
}
