import { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { ICommunityPostFeed } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPostFeed";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace CommunityPostFeedAtResponseTransformer {
  export type Payload = Prisma.community_postsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        title: true,
        content_type: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        author: {
          select: {
            id: true,
            display_name: true,
            is_email_verified: true,
            created_at: true,
          },
        },
        community: {
          select: {
            id: true,
            name: true,
            description: true,
            icon_url: true,
            created_at: true,
          },
        },
        status: {
          select: {
            name: true,
          },
        },
        community_post_texts: {
          select: {
            content: true,
          },
        },
        community_post_links: {
          select: {
            domain_name: true,
          },
        },
        community_post_edits: {
          select: {
            id: true,
            old_content: true,
            new_content: true,
            updated_at: true,
          },
        },
        community_post_comments_counts: {
          select: {
            comment_count: true,
          },
        },
        community_post_view_stats: {
          select: {
            total_views: true,
            unique_views: true,
          },
        },
        community_post_feeds: {
          select: {
            feed_id: true,
            feed_type: true,
            sort_algorithm: true,
          },
        },
        community_post_votes: {
          select: {
            vote_type: true,
          },
        },
        community_mv_community_popular_feeds: {
          select: {
            post_id: true,
            feed_id: true,
            position: true,
          },
        },
        community_mv_community_feeds: {
          select: {
            post_id: true,
            community_id: true,
            position: true,
          },
        },
        community_mv_post_feed_indices: {
          select: {
            vote_score: true,
          },
        },
        community_comments: {
          select: {
            id: true,
            content: true,
            created_at: true,
          },
        },
        community_audit_logs: {
          select: {
            id: true,
            action: true,
            performed_by: true,
            timestamp: true,
          },
        },
      },
    } satisfies Prisma.community_postsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPostFeed.IResponse> {
    return {
      id: input.id,
      title: input.title,
      author: {
        id: input.author.id,
        display_name: input.author.display_name,
        is_email_verified: input.author.is_email_verified,
        created_at: input.author.created_at.toISOString(),
      },
      community: {
        id: input.community.id,
        name: input.community.name,
        description: input.community.description,
        icon_url: input.community.icon_url,
        created_at: input.community.created_at.toISOString(),
      },
      vote_score: input.community_mv_post_feed_indices?.[0]?.vote_score ?? 0,
      comment_count: input.community_post_comments_counts?.comment_count ?? 0,
      content_preview:
        input.content_type === "text"
          ? (input.community_post_texts?.content?.substring(0, 200) ?? "")
          : input.content_type === "link"
            ? (input.community_post_links?.domain_name ?? "")
            : "",
    };
  }
}
