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
import { CommunitymemberPayload } from "../decorators/payload/CommunitymemberPayload";

export async function putCommunityBbsCommunityMemberCommentsCommentId(props: {
  communityMember: CommunitymemberPayload;
  commentId: string & tags.Format<"uuid">;
  body: ICommunityBbsComment.IUpdate;
}): Promise<ICommunityBbsComment> {
  const { communityMember, commentId, body } = props;

  // Ensure at least one editable field provided
  if (body.body === undefined && body.edit_summary === undefined) {
    throw new HttpException("Bad Request: No editable fields provided", 400);
  }

  // Load the comment with relations required for response and authorization
  const comment = await MyGlobal.prisma.community_bbs_comments.findUnique({
    where: { id: commentId },
    include: {
      community: {
        include: { creator: true, community_bbs_community_settings: true },
      },
      author: true,
    },
  });

  if (!comment || comment.deleted_at !== null) {
    throw new HttpException("Not Found", 404);
  }

  // Authorization: owner or active moderator
  const isOwner =
    comment.community_bbs_communitymember_id === communityMember.id;
  let isModerator = false;
  if (!isOwner) {
    const moderator =
      await MyGlobal.prisma.community_bbs_community_moderators.findFirst({
        where: {
          community_id: comment.community_bbs_community_id,
          community_member_id: communityMember.id,
          active: true,
        },
      });
    isModerator = !!moderator;
  }

  // Enforce edit window for non-moderators: 1 hour
  if (!isOwner && !isModerator) {
    throw new HttpException("Forbidden", 403);
  }

  const nowMs = Date.now();
  const createdMs = comment.created_at.getTime();
  const EDIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
  if (!isModerator && nowMs - createdMs > EDIT_WINDOW_MS) {
    throw new HttpException("Forbidden: edit window expired", 403);
  }

  // Business validation: body length
  if (body.body !== undefined && body.body.length > 10000) {
    throw new HttpException("Bad Request: body too long", 400);
  }

  // Prepare timestamp
  const now = toISOStringSafe(new Date());

  // If body change requested and different, create edit record and update comment in transaction
  let updatedComment;
  if (body.body !== undefined && body.body !== comment.body) {
    const editId = v4() as string & tags.Format<"uuid">;
    await MyGlobal.prisma.$transaction([
      MyGlobal.prisma.community_bbs_comment_edits.create({
        data: {
          id: editId,
          community_bbs_comment_id: comment.id,
          community_bbs_editor_id: communityMember.id,
          previous_body: comment.body,
          new_body: body.body,
          edit_summary: body.edit_summary ?? null,
          created_at: now,
          updated_at: now,
          deleted_at: null,
        },
      }),
      MyGlobal.prisma.community_bbs_comments.update({
        where: { id: comment.id },
        data: {
          body: body.body,
          updated_at: now,
        },
      }),
    ]);

    updatedComment = await MyGlobal.prisma.community_bbs_comments.findUnique({
      where: { id: comment.id },
      include: {
        community: {
          include: { creator: true, community_bbs_community_settings: true },
        },
        author: true,
      },
    });
  } else {
    // Only edit_summary provided or no-op body change: perform update for updated_at if needed
    if (body.body === undefined) {
      // No body change; just update updated_at if edit_summary provided by moderator/owner
      updatedComment = await MyGlobal.prisma.community_bbs_comments.update({
        where: { id: comment.id },
        data: { updated_at: now },
      });
      // fetch with relations
      updatedComment = await MyGlobal.prisma.community_bbs_comments.findUnique({
        where: { id: comment.id },
        include: {
          community: {
            include: { creator: true, community_bbs_community_settings: true },
          },
          author: true,
        },
      });
    } else {
      // body provided but identical: still update updated_at
      updatedComment = await MyGlobal.prisma.community_bbs_comments.update({
        where: { id: comment.id },
        data: { updated_at: now },
      });
      updatedComment = await MyGlobal.prisma.community_bbs_comments.findUnique({
        where: { id: comment.id },
        include: {
          community: {
            include: { creator: true, community_bbs_community_settings: true },
          },
          author: true,
        },
      });
    }
  }

  if (!updatedComment) throw new HttpException("Not Found", 404);

  // Map to DTO
  const result: ICommunityBbsComment = {
    id: updatedComment.id as string & tags.Format<"uuid">,
    community_bbs_post_id: updatedComment.community_bbs_post_id as string &
      tags.Format<"uuid">,
    community: {
      id: updatedComment.community.id as string & tags.Format<"uuid">,
      name: updatedComment.community.name,
      slug: updatedComment.community.slug,
      description: updatedComment.community.description ?? null,
      creator: {
        id: updatedComment.community.creator.id as string & tags.Format<"uuid">,
        username: updatedComment.community.creator.username,
        display_name: updatedComment.community.creator.display_name ?? null,
        karma: updatedComment.community.creator.karma,
        created_at: toISOStringSafe(
          updatedComment.community.creator.created_at,
        ),
        updated_at: toISOStringSafe(
          updatedComment.community.creator.updated_at,
        ),
      },
      visibility: updatedComment.community.visibility as
        | "public"
        | "restricted"
        | "private",
      post_approval_required: updatedComment.community.post_approval_required,
      members_count: Number(updatedComment.community.members_count),
      posts_count: Number(updatedComment.community.posts_count),
      community_settings: updatedComment.community
        .community_bbs_community_settings
        ? {
            id: updatedComment.community.community_bbs_community_settings.id as
              | (string & tags.Format<"uuid">)
              | undefined,
            community_id: updatedComment.community
              .community_bbs_community_settings.community_id as string &
              tags.Format<"uuid">,
            visibility: typia.assert<
              "public" | "restricted" | "private" | undefined
            >(
              updatedComment.community.community_bbs_community_settings
                .visibility ?? undefined,
            ),
            require_post_approval:
              updatedComment.community.community_bbs_community_settings
                .require_post_approval ?? null,
            max_images_per_post:
              updatedComment.community.community_bbs_community_settings
                .max_images_per_post ?? null,
            allowed_image_mime_types: updatedComment.community
              .community_bbs_community_settings.allowed_image_mime_types
              ? updatedComment.community.community_bbs_community_settings.allowed_image_mime_types.split(
                  ",",
                )
              : undefined,
            created_at: toISOStringSafe(
              updatedComment.community.community_bbs_community_settings
                .created_at,
            ),
            updated_at: toISOStringSafe(
              updatedComment.community.community_bbs_community_settings
                .updated_at,
            ),
            deleted_at: updatedComment.community
              .community_bbs_community_settings.deleted_at
              ? toISOStringSafe(
                  updatedComment.community.community_bbs_community_settings
                    .deleted_at,
                )
              : null,
          }
        : undefined,
      created_at: toISOStringSafe(updatedComment.community.created_at),
      updated_at: toISOStringSafe(updatedComment.community.updated_at),
      deleted_at: updatedComment.community.deleted_at
        ? toISOStringSafe(updatedComment.community.deleted_at)
        : null,
    },
    author: {
      id: updatedComment.author.id as string & tags.Format<"uuid">,
      username: updatedComment.author.username,
      display_name: updatedComment.author.display_name ?? null,
      karma: updatedComment.author.karma,
      created_at: toISOStringSafe(updatedComment.author.created_at),
      updated_at: toISOStringSafe(updatedComment.author.updated_at),
    },
    parent_id: updatedComment.community_bbs_parent_id ?? null,
    body: updatedComment.body ?? "",
    is_removed: updatedComment.is_removed ?? undefined,
    removed_reason: updatedComment.removed_reason ?? null,
    score: updatedComment.score ?? undefined,
    upvotes: updatedComment.upvotes ?? undefined,
    downvotes: updatedComment.downvotes ?? undefined,
    created_at: toISOStringSafe(updatedComment.created_at),
    updated_at: updatedComment.updated_at
      ? toISOStringSafe(updatedComment.updated_at)
      : undefined,
    deleted_at: updatedComment.deleted_at
      ? toISOStringSafe(updatedComment.deleted_at)
      : null,
  };

  return result;
}
