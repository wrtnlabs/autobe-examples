import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";

import { toISOStringSafe } from "../utils/toISOStringSafe";

import { CommunityPlatformMemberTransformer } from "./CommunityPlatformMemberTransformer";

export namespace CommunityPlatformCommentAtInvertTransformer {
  export type Payload = Prisma.community_platform_commentsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        content: true,
        vote_score: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        author: {
          select: {
            id: true,
          },
        },
        parent: true,
        recursive: true,
        community_platform_comment_votes: true,
        community_platform_comment_edits: true,
        community_platform_comment_reports: true,
        community_platform_comment_visibilities: true,
        community_platform_moderation_logs: true,
        community_platform_reports: true,
        // Inline join to get post data - using the same select structure as CommunityPlatformPostAtSummaryTransformer
        post: {
          select: {
            id: true,
            created_at: true,
            vote_score: true,
            comment_count: true,
            author: {
              select: {
                id: true,
              },
            },
            community: {
              select: {
                id: true,
                name: true,
                description: true,
                icon: true,
                subscriber_count: true,
                created_at: true,
              },
            },
            title: true,
            updated_at: true,
            deleted_at: true,
          },
        },
      },
    } satisfies Prisma.community_platform_commentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformComment.IInvert> {
    const authorSummary = await CommunityPlatformMemberTransformer.transform(
      input.author,
    );
    // Extract post data and transform to ICommunityPlatformPost.ISummary
    const postSummary: ICommunityPlatformPost.ISummary = {
      id: input.post.id,
      createdAt: toISOStringSafe(input.post.created_at),
      voteScore: input.post.vote_score,
      commentCount: input.post.comment_count,
      author: {
        id: input.post.author.id,
      },
      community: {
        name: input.post.community.name,
        description: input.post.community.description,
        icon: (input.post.community.icon ?? "") satisfies string as string,
        subscriber_count: input.post.community.subscriber_count,
        created_at: toISOStringSafe(input.post.community.created_at),
      },
    };
    return {
      id: input.id,
      content: input.content,
      created_at: toISOStringSafe(input.created_at),
      score: input.vote_score,
      post: postSummary,
      author: authorSummary,
      community: postSummary.community,
    };
  }
}
