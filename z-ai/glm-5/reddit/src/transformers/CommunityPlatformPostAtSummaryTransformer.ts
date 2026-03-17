import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityPlatformCommunityAtSummaryTransformer } from "./CommunityPlatformCommunityAtSummaryTransformer";
import { CommunityPlatformMemberAtSummaryTransformer } from "./CommunityPlatformMemberAtSummaryTransformer";

export namespace CommunityPlatformPostAtSummaryTransformer {
  export type Payload = Prisma.community_platform_postsGetPayload<
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
        author: CommunityPlatformMemberAtSummaryTransformer.select(),
        community: CommunityPlatformCommunityAtSummaryTransformer.select(),
        textContent: {
          select: {
            content: true,
          },
        },
        linkUrl: {
          select: {
            url: true,
          },
        },
        votes: {
          select: {
            vote_type: true,
          },
        },
        comments: {
          select: {
            parent_comment_id: true,
          },
        },
        reportPosts: {
          select: {
            id: true,
          },
        },
      },
    } satisfies Prisma.community_platform_postsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformPost.ISummary> {
    // Compute vote score: +1 for upvote, -1 for downvote
    const voteScore = input.votes.reduce((sum, vote) => {
      return sum + (vote.vote_type === "upvote" ? 1 : -1);
    }, 0);
    // Count top-level comments (parent_comment_id is null)
    const commentCount = input.comments.filter(
      (comment) => comment.parent_comment_id === null,
    ).length;
    // Extract text preview for text posts
    const textPreview =
      input.textContent?.content?.substring(0, 200) ?? undefined;
    // Extract URL domain for link posts
    let urlDomain: string | undefined = undefined;
    if (input.linkUrl?.url) {
      try {
        const url = new URL(input.linkUrl.url);
        urlDomain = url.hostname;
      } catch {
        urlDomain = undefined;
      }
    }
    return {
      id: input.id,
      title: input.title,
      postType: input.post_type,
      author: await CommunityPlatformMemberAtSummaryTransformer.transform(
        input.author,
      ),
      community: await CommunityPlatformCommunityAtSummaryTransformer.transform(
        input.community,
      ),
      voteScore,
      commentCount,
      textPreview,
      urlDomain,
      thumbnailUrl: undefined,
      createdAt: toISOStringSafe(input.created_at),
    };
  }
}
