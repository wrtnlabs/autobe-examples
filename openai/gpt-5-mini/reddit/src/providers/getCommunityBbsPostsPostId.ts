import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityBbsPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsPost";
import { ICommunityBbsCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunityMember";
import { ICommunityBbsCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunity";
import { ICommunityBbsCommunitySettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunitySettings";
import { ICommunityBbsPostMedia } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsPostMedia";
import { ICommunityBbsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsSystemAdmin";

export async function getCommunityBbsPostsPostId(props: {
  postId: string & tags.Format<"uuid">;
}): Promise<ICommunityBbsPost> {
  const { postId } = props;

  const post = await MyGlobal.prisma.community_bbs_posts.findUnique({
    where: { id: postId },
    include: {
      community: {
        include: {
          creator: { include: { community_bbs_profiles: true } },
          community_bbs_community_settings: true,
        },
      },
      author: { include: { community_bbs_profiles: true } },
      community_bbs_post_media: { include: { moderatedBy: true } },
    },
  });

  if (!post) {
    throw new HttpException("Not Found", 404);
  }

  // Public endpoint: only allow published posts
  if (!post.is_published || post.business_status !== "published") {
    throw new HttpException("Forbidden", 403);
  }

  return {
    id: post.id as string & tags.Format<"uuid">,
    community_bbs_community_id: post.community_bbs_community_id as string &
      tags.Format<"uuid">,
    community_bbs_communitymember_id:
      post.community_bbs_communitymember_id as string & tags.Format<"uuid">,
    title: post.title,
    body: post.body === null ? null : post.body,
    post_type: post.post_type as "text" | "link" | "image",
    link_url:
      post.link_url === null
        ? undefined
        : (post.link_url as string & tags.Format<"uri">),
    score: post.score,
    upvotes: post.upvotes,
    downvotes: post.downvotes,
    comment_count: post.comment_count,
    is_published: post.is_published,
    published_at: post.published_at ? toISOStringSafe(post.published_at) : null,
    business_status: post.business_status,
    created_at: toISOStringSafe(post.created_at),
    updated_at: toISOStringSafe(post.updated_at),
    deleted_at: post.deleted_at ? toISOStringSafe(post.deleted_at) : null,

    author: {
      id: post.author.id as string & tags.Format<"uuid">,
      username: post.author.username,
      display_name:
        post.author.display_name ??
        post.author.community_bbs_profiles?.display_name ??
        undefined,
      karma: post.author.karma,
      created_at: toISOStringSafe(post.author.created_at),
      updated_at: toISOStringSafe(post.author.updated_at),
    },

    community: {
      id: post.community.id as string & tags.Format<"uuid">,
      name: post.community.name,
      slug: post.community.slug,
      description: post.community.description ?? undefined,
      creator: {
        id: post.community.creator.id as string & tags.Format<"uuid">,
        username: post.community.creator.username,
        display_name:
          post.community.creator.display_name ??
          post.community.creator.community_bbs_profiles?.display_name ??
          undefined,
        karma: post.community.creator.karma,
        created_at: toISOStringSafe(post.community.creator.created_at),
        updated_at: toISOStringSafe(post.community.creator.updated_at),
      },
      visibility: post.community.visibility as
        | "public"
        | "restricted"
        | "private",
      post_approval_required: post.community.post_approval_required,
      members_count: post.community.members_count,
      posts_count: post.community.posts_count,
      community_settings: post.community.community_bbs_community_settings
        ? {
            id: post.community.community_bbs_community_settings.id as string &
              tags.Format<"uuid">,
            community_id: post.community.community_bbs_community_settings
              .community_id as string & tags.Format<"uuid">,
            visibility: typia.assert<
              "public" | "restricted" | "private" | undefined
            >(
              post.community.community_bbs_community_settings.visibility ??
                undefined,
            ),
            require_post_approval:
              post.community.community_bbs_community_settings
                .require_post_approval ?? null,
            max_images_per_post:
              post.community.community_bbs_community_settings
                .max_images_per_post ?? null,
            allowed_image_mime_types: post.community
              .community_bbs_community_settings.allowed_image_mime_types
              ? post.community.community_bbs_community_settings.allowed_image_mime_types.split(
                  ",",
                )
              : undefined,
            created_at: toISOStringSafe(
              post.community.community_bbs_community_settings.created_at,
            ),
            updated_at: toISOStringSafe(
              post.community.community_bbs_community_settings.updated_at,
            ),
            deleted_at: post.community.community_bbs_community_settings
              .deleted_at
              ? toISOStringSafe(
                  post.community.community_bbs_community_settings.deleted_at,
                )
              : null,
          }
        : undefined,
      created_at: toISOStringSafe(post.community.created_at),
      updated_at: toISOStringSafe(post.community.updated_at),
      deleted_at: post.community.deleted_at
        ? toISOStringSafe(post.community.deleted_at)
        : null,
    },

    media: post.community_bbs_post_media.map((m) => ({
      id: m.id as string & tags.Format<"uuid">,
      post_id: m.community_bbs_post_id as string & tags.Format<"uuid">,
      post: null,
      url: m.url as string & tags.Format<"uri">,
      media_type: m.media_type,
      ordering: m.ordering,
      size_bytes: m.size_bytes,
      is_moderated: m.is_moderated,
      moderation_status: m.moderation_status as
        | "pending"
        | "approved"
        | "rejected",
      moderated_at: m.moderated_at ? toISOStringSafe(m.moderated_at) : null,
      moderated_by: m.moderatedBy
        ? {
            id: m.moderatedBy.id as string & tags.Format<"uuid">,
            display_name: m.moderatedBy.display_name ?? undefined,
            is_super_admin: m.moderatedBy.is_super_admin ?? undefined,
            created_at: m.moderatedBy.created_at
              ? toISOStringSafe(m.moderatedBy.created_at)
              : undefined,
          }
        : null,
      created_at: toISOStringSafe(m.created_at),
    })),
  };
}
