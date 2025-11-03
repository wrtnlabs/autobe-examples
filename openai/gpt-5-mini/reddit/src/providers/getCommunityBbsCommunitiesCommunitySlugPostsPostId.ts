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

export async function getCommunityBbsCommunitiesCommunitySlugPostsPostId(props: {
  communitySlug: string;
  postId: string & tags.Format<"uuid">;
}): Promise<ICommunityBbsPost> {
  const { communitySlug, postId } = props;

  // Load community with settings and creator summary
  const community = await MyGlobal.prisma.community_bbs_communities.findUnique({
    where: { slug: communitySlug },
    include: {
      community_bbs_community_settings: true,
      creator: true,
    },
  });

  if (!community || community.deleted_at) {
    throw new HttpException("Not Found", 404);
  }

  // Determine whether community requires post approval
  const requireApproval =
    community.community_bbs_community_settings &&
    community.community_bbs_community_settings.require_post_approval !==
      undefined
      ? community.community_bbs_community_settings.require_post_approval
      : community.post_approval_required;

  // Fetch the post and related data
  const post = await MyGlobal.prisma.community_bbs_posts.findFirst({
    where: {
      id: postId,
      community_bbs_community_id: community.id,
    },
    include: {
      author: { include: { community_bbs_profiles: true } },
      community: {
        include: { community_bbs_community_settings: true, creator: true },
      },
      community_bbs_post_media: { include: { moderatedBy: true } },
    },
  });

  if (!post || post.deleted_at) {
    throw new HttpException("Not Found", 404);
  }

  // Enforce publication/approval rules for public callers (no auth in props)
  if (
    requireApproval &&
    (post.business_status !== "published" || post.is_published === false)
  ) {
    throw new HttpException("Forbidden", 403);
  }

  // Map author summary
  const authorRecord = post.author;
  if (!authorRecord) throw new HttpException("Not Found", 404);

  const authorSummary = {
    id: authorRecord.id as string & tags.Format<"uuid">,
    username: authorRecord.username,
    display_name:
      (authorRecord.community_bbs_profiles &&
        authorRecord.community_bbs_profiles.display_name) ??
      authorRecord.display_name ??
      undefined,
    karma: authorRecord.karma,
    created_at: toISOStringSafe(authorRecord.created_at),
    updated_at: toISOStringSafe(authorRecord.updated_at),
  } satisfies ICommunityBbsCommunityMember.ISummary;

  // Map community summary
  const communitySettings =
    post.community.community_bbs_community_settings ??
    community.community_bbs_community_settings;

  const communitySummary = {
    id: post.community.id as string & tags.Format<"uuid">,
    name: post.community.name,
    slug: post.community.slug,
    description: post.community.description ?? undefined,
    creator: {
      id: post.community.creator.id as string & tags.Format<"uuid">,
      username: post.community.creator.username,
      display_name: post.community.creator.display_name ?? undefined,
      karma: post.community.creator.karma,
      created_at: toISOStringSafe(post.community.creator.created_at),
      updated_at: toISOStringSafe(post.community.creator.updated_at),
    } satisfies ICommunityBbsCommunityMember.ISummary,
    visibility: post.community.visibility as
      | "public"
      | "restricted"
      | "private",
    post_approval_required: post.community.post_approval_required,
    members_count: Number(post.community.members_count),
    posts_count: Number(post.community.posts_count),
    community_settings: communitySettings
      ? {
          id: communitySettings.id ?? undefined,
          community_id: communitySettings.community_id,
          visibility: (communitySettings.visibility ?? undefined) as
            | "public"
            | "restricted"
            | "private"
            | undefined,
          require_post_approval:
            communitySettings.require_post_approval ?? null,
          max_images_per_post: communitySettings.max_images_per_post ?? null,
          allowed_image_mime_types: communitySettings.allowed_image_mime_types
            ? communitySettings.allowed_image_mime_types.split(",")
            : undefined,
          created_at: communitySettings.created_at
            ? toISOStringSafe(communitySettings.created_at)
            : undefined,
          updated_at: communitySettings.updated_at
            ? toISOStringSafe(communitySettings.updated_at)
            : undefined,
          deleted_at: communitySettings.deleted_at
            ? toISOStringSafe(communitySettings.deleted_at)
            : null,
        }
      : undefined,
    created_at: toISOStringSafe(post.community.created_at),
    updated_at: toISOStringSafe(post.community.updated_at),
    deleted_at: post.community.deleted_at
      ? toISOStringSafe(post.community.deleted_at)
      : undefined,
  } satisfies ICommunityBbsCommunity.ISummary;

  // Map media
  const media = (post.community_bbs_post_media ?? []).map((m) => {
    return {
      id: m.id as string & tags.Format<"uuid">,
      post_id: m.community_bbs_post_id as string & tags.Format<"uuid">,
      post: undefined,
      url: m.url,
      media_type: m.media_type,
      ordering: Number(m.ordering),
      size_bytes: Number(m.size_bytes),
      is_moderated: m.is_moderated,
      moderation_status: m.moderation_status as
        | "pending"
        | "approved"
        | "rejected",
      moderated_at: m.moderated_at ? toISOStringSafe(m.moderated_at) : null,
      moderated_by: m.moderatedBy
        ? {
            id: m.moderatedBy.id as string & tags.Format<"uuid">,
            display_name: m.moderatedBy.display_name ?? null,
            is_super_admin: m.moderatedBy.is_super_admin ?? undefined,
            created_at: m.moderatedBy.created_at
              ? toISOStringSafe(m.moderatedBy.created_at)
              : null,
          }
        : null,
      created_at: toISOStringSafe(m.created_at),
    } satisfies ICommunityBbsPostMedia;
  });

  // Build final DTO
  const result = {
    id: post.id as string & tags.Format<"uuid">,
    community_bbs_community_id: post.community_bbs_community_id as string &
      tags.Format<"uuid">,
    community_bbs_communitymember_id:
      post.community_bbs_communitymember_id as string & tags.Format<"uuid">,
    title: post.title,
    body: post.body ?? null,
    post_type: post.post_type as "text" | "link" | "image",
    link_url: post.link_url ?? null,
    score: Number(post.score),
    upvotes: Number(post.upvotes),
    downvotes: Number(post.downvotes),
    comment_count: Number(post.comment_count),
    is_published: post.is_published,
    published_at: post.published_at ? toISOStringSafe(post.published_at) : null,
    business_status: post.business_status,
    created_at: toISOStringSafe(post.created_at),
    updated_at: toISOStringSafe(post.updated_at),
    deleted_at: post.deleted_at ? toISOStringSafe(post.deleted_at) : null,
    author: authorSummary,
    community: communitySummary,
    media: media,
  } satisfies ICommunityBbsPost;

  return result;
}
