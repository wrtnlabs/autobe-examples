import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityBbsComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsComment";
import { ICommunityBbsCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunity";
import { ICommunityBbsCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunityMember";
import { ICommunityBbsCommunitySettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunitySettings";

export async function getCommunityBbsCommentsCommentId(props: {
  commentId: string & tags.Format<"uuid">;
}): Promise<ICommunityBbsComment> {
  const { commentId } = props;

  // Fetch the comment and ensure it's not soft-deleted
  const comment = await MyGlobal.prisma.community_bbs_comments.findUnique({
    where: { id: commentId },
    select: {
      id: true,
      community_bbs_post_id: true,
      community_bbs_community_id: true,
      community_bbs_communitymember_id: true,
      community_bbs_parent_id: true,
      body: true,
      is_removed: true,
      removed_reason: true,
      score: true,
      upvotes: true,
      downvotes: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });

  if (!comment || comment.deleted_at !== null) {
    throw new HttpException("Not Found", 404);
  }

  // Verify parent post exists and is published
  const post = await MyGlobal.prisma.community_bbs_posts.findUnique({
    where: { id: comment.community_bbs_post_id },
    select: { id: true, is_published: true, community_bbs_community_id: true },
  });
  if (!post || post.is_published !== true) {
    throw new HttpException("Not Found", 404);
  }

  // Fetch community and related data (creator, settings)
  const community = await MyGlobal.prisma.community_bbs_communities.findUnique({
    where: { id: comment.community_bbs_community_id },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      visibility: true,
      post_approval_required: true,
      members_count: true,
      posts_count: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      creator: {
        select: {
          id: true,
          username: true,
          display_name: true,
          karma: true,
          created_at: true,
          updated_at: true,
        },
      },
      community_bbs_community_settings: {
        select: {
          id: true,
          community_id: true,
          visibility: true,
          require_post_approval: true,
          max_images_per_post: true,
          allowed_image_mime_types: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      },
    },
  });

  if (!community || community.deleted_at !== null) {
    throw new HttpException("Not Found", 404);
  }

  if (community.visibility !== "public") {
    throw new HttpException("Forbidden", 403);
  }

  const creator = community.creator;
  if (!creator) throw new HttpException("Not Found", 404);

  // Normalize community settings
  const rawSettings = community.community_bbs_community_settings ?? null;
  const communitySettings = rawSettings
    ? {
        id: rawSettings.id as string & tags.Format<"uuid">,
        community_id: rawSettings.community_id as string & tags.Format<"uuid">,
        visibility: rawSettings.visibility as
          | "public"
          | "restricted"
          | "private",
        require_post_approval:
          rawSettings.require_post_approval === null
            ? null
            : rawSettings.require_post_approval,
        max_images_per_post:
          rawSettings.max_images_per_post === null
            ? null
            : rawSettings.max_images_per_post,
        allowed_image_mime_types: rawSettings.allowed_image_mime_types
          ? rawSettings.allowed_image_mime_types
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
          : undefined,
        created_at: rawSettings.created_at
          ? toISOStringSafe(rawSettings.created_at)
          : undefined,
        updated_at: rawSettings.updated_at
          ? toISOStringSafe(rawSettings.updated_at)
          : undefined,
        deleted_at: rawSettings.deleted_at
          ? toISOStringSafe(rawSettings.deleted_at)
          : null,
      }
    : undefined;

  const communitySummary = {
    id: community.id as string & tags.Format<"uuid">,
    name: community.name,
    slug: community.slug,
    description: community.description ?? null,
    creator: {
      id: creator.id as string & tags.Format<"uuid">,
      username: creator.username,
      display_name: creator.display_name ?? null,
      karma: creator.karma,
      created_at: toISOStringSafe(creator.created_at),
      updated_at: toISOStringSafe(creator.updated_at),
    },
    visibility: community.visibility as "public" | "restricted" | "private",
    post_approval_required: community.post_approval_required,
    members_count: community.members_count,
    posts_count: community.posts_count,
    community_settings: communitySettings,
    created_at: toISOStringSafe(community.created_at),
    updated_at: toISOStringSafe(community.updated_at),
    deleted_at: community.deleted_at
      ? toISOStringSafe(community.deleted_at)
      : null,
  } satisfies ICommunityBbsCommunity.ISummary;

  // Author summary
  const member = await MyGlobal.prisma.community_bbs_communitymember.findUnique(
    {
      where: { id: comment.community_bbs_communitymember_id },
      select: {
        id: true,
        username: true,
        display_name: true,
        karma: true,
        created_at: true,
        updated_at: true,
      },
    },
  );
  if (!member) throw new HttpException("Not Found", 404);

  const profile = await MyGlobal.prisma.community_bbs_profiles.findUnique({
    where: { community_bbs_communitymember_id: member.id },
    select: { display_name: true },
  });

  const authorSummary = {
    id: member.id as string & tags.Format<"uuid">,
    username: member.username,
    display_name: profile?.display_name ?? member.display_name ?? null,
    karma: member.karma,
    created_at: toISOStringSafe(member.created_at),
    updated_at: toISOStringSafe(member.updated_at),
  } satisfies ICommunityBbsCommunityMember.ISummary;

  // Assemble final DTO
  const result = {
    id: comment.id as string & tags.Format<"uuid">,
    community_bbs_post_id: comment.community_bbs_post_id as string &
      tags.Format<"uuid">,
    community: communitySummary,
    author: authorSummary,
    parent_id: comment.community_bbs_parent_id ?? null,
    body: comment.body ?? "",
    is_removed: comment.is_removed ?? undefined,
    removed_reason: comment.removed_reason ?? null,
    score: comment.score,
    upvotes: comment.upvotes,
    downvotes: comment.downvotes,
    created_at: toISOStringSafe(comment.created_at),
    updated_at: comment.updated_at
      ? toISOStringSafe(comment.updated_at)
      : undefined,
    deleted_at: comment.deleted_at ? toISOStringSafe(comment.deleted_at) : null,
  } satisfies ICommunityBbsComment;

  return result;
}
