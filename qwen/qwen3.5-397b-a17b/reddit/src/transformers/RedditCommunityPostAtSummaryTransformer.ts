import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditCommunityCommunityAtSummaryTransformer } from "./RedditCommunityCommunityAtSummaryTransformer";
import { RedditCommunityMemberAtSummaryTransformer } from "./RedditCommunityMemberAtSummaryTransformer";

export namespace RedditCommunityPostAtSummaryTransformer {
  export type Payload = Prisma.reddit_community_postsGetPayload<
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
        member: RedditCommunityMemberAtSummaryTransformer.select(),
        community: RedditCommunityCommunityAtSummaryTransformer.select(),
        text: {
          select: {
            body: true,
          },
        } satisfies Prisma.reddit_community_post_textsFindManyArgs,
        link: {
          select: {
            domain: true,
          },
        } satisfies Prisma.reddit_community_post_linksFindManyArgs,
        image: {
          select: {
            thumbnail_url: true,
          },
        } satisfies Prisma.reddit_community_post_imagesFindManyArgs,
        votes: {
          select: {
            value: true,
          },
        } satisfies Prisma.reddit_community_post_votesFindManyArgs,
        comments: {
          select: {
            id: true,
          },
        } satisfies Prisma.reddit_community_commentsFindManyArgs,
        reports: {
          select: {
            id: true,
          },
        } satisfies Prisma.reddit_community_report_of_postsFindManyArgs,
        _count: {
          select: {
            comments: true,
          },
        },
      },
    } satisfies Prisma.reddit_community_postsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCommunityPost.ISummary> {
    return {
      id: input.id,
      title: input.title,
      post_type: input.post_type as "text" | "link" | "image",
      author: await RedditCommunityMemberAtSummaryTransformer.transform(
        input.member,
      ),
      community: await RedditCommunityCommunityAtSummaryTransformer.transform(
        input.community,
      ),
      vote_score: input.votes.reduce((sum, vote) => sum + vote.value, 0),
      comment_count: input._count.comments,
      created_at: toISOStringSafe(input.created_at),
      text_preview:
        input.post_type === "text" ? (input.text?.body ?? null) : undefined,
      thumbnail_url:
        input.post_type === "image"
          ? (input.image?.thumbnail_url ?? null)
          : undefined,
      link_domain:
        input.post_type === "link" ? (input.link?.domain ?? null) : undefined,
    } satisfies IRedditCommunityPost.ISummary;
  }
}
