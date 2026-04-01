import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityIcon";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

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
        text_content: true,
        link_url: true,
        image_path: true,
        created_at: true,
        author: RedditCommunityMemberAtSummaryTransformer.select(),
        community: RedditCommunityCommunityAtSummaryTransformer.select(),
        votes: {
          select: {
            direction: true,
          },
        } satisfies Prisma.reddit_community_post_votesFindManyArgs,
        comments: {
          select: {
            id: true,
            deleted_at: true,
          },
        } satisfies Prisma.reddit_community_commentsFindManyArgs,
      },
    } satisfies Prisma.reddit_community_postsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCommunityPost.ISummary> {
    return {
      id: input.id,
      title: input.title,
      author: await RedditCommunityMemberAtSummaryTransformer.transform(
        input.author,
      ),
      community: await RedditCommunityCommunityAtSummaryTransformer.transform(
        input.community,
      ),
      vote_score: input.votes.reduce((sum, vote) => {
        return (
          sum +
          (vote.direction === "UPVOTE"
            ? 1
            : vote.direction === "DOWNVOTE"
              ? -1
              : 0)
        );
      }, 0),
      comments_count: input.comments.filter(
        (comment) => comment.deleted_at === null,
      ).length,
      created_at: input.created_at.toISOString(),
      post_type: input.post_type,
      text_preview:
        input.post_type === "text" && input.text_content
          ? input.text_content.slice(0, 200)
          : null,
      link_domain:
        input.post_type === "link" && input.link_url
          ? new URL(input.link_url).hostname
          : null,
      image_thumbnail:
        input.post_type === "image" ? (input.image_path ?? null) : null,
    };
  }
}
