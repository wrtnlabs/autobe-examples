import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityBBSComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSComment";
import { ICommunityBBSPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSPost";
import { ICommunityBBSCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSCitizen";
import { ICommunityBBSCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSCommunity";
import { CitizenPayload } from "../decorators/payload/CitizenPayload";

export async function putCommunityBBSCitizenCommentsCommentId(props: {
  citizen: CitizenPayload;
  commentId: string;
  body: ICommunityBBSComment.IUpdate;
}): Promise<ICommunityBBSComment> {
  // Fetch the existing comment
  const comment = await MyGlobal.prisma.community_bbs_comments.findUnique({
    where: { id: props.commentId },
  });

  if (!comment) {
    throw new HttpException("Comment not found", 404);
  }

  // Verify ownership or moderation rights
  const isAuthor = comment.citizen_id === props.citizen.id;
  const isModerator =
    (await MyGlobal.prisma.community_bbs_moderator.findUnique({
      where: { id: props.citizen.id },
    })) !== null;

  if (!isAuthor && !isModerator) {
    throw new HttpException("Forbidden", 403);
  }

  // Only allow body update if author and within 24 hours
  const now = new Date();
  const created = new Date(comment.created_at);
  const hoursDiff = (now.getTime() - created.getTime()) / (1000 * 60 * 60);

  const updateData: any = {};

  if (props.body.body !== undefined) {
    if (isAuthor && hoursDiff <= 24) {
      updateData.body = props.body.body;
    } else if (isModerator) {
      updateData.body = props.body.body;
    } else {
      throw new HttpException("Cannot edit comment after 24 hours", 403);
    }
  }

  if (props.body.business_status !== undefined) {
    if (!isModerator) {
      throw new HttpException(
        "Forbidden: Only moderators can change status",
        403,
      );
    }
    updateData.business_status = props.body.business_status;
  }

  // No changes to make
  if (Object.keys(updateData).length === 0) {
    return {
      id: comment.id,
      post_id: comment.post_id,
      citizen_id: comment.citizen_id,
      body: comment.body,
      business_status: comment.business_status satisfies string as string as
        | "pending_review"
        | "approved"
        | "rejected"
        | "hidden",
      created_at: toISOStringSafe(comment.created_at),
      updated_at: toISOStringSafe(comment.updated_at),
      deleted_at: comment.deleted_at
        ? toISOStringSafe(comment.deleted_at)
        : null,
      post: {
        id: comment.post_id,
        title: "",
        created_at: toISOStringSafe(comment.created_at),
        status: "pending_review" satisfies string as string as
          | "pending_review"
          | "approved"
          | "rejected"
          | "hidden",
        author: {
          id: comment.citizen_id,
          username: "",
          nickname: null,
        },
        community: comment.post_id,
      },
      citizen: {
        id: comment.citizen_id,
        username: "",
        nickname: null,
      },
    };
  }

  // Update the comment directly with inline parameters
  const updated = await MyGlobal.prisma.community_bbs_comments.update({
    where: { id: props.commentId },
    data: {
      ...updateData,
      updated_at: toISOStringSafe(now),
    },
  });

  // Fetch related post to populate post summary
  const post = await MyGlobal.prisma.community_bbs_posts.findUnique({
    where: { id: updated.post_id },
    select: {
      title: true,
      created_at: true,
      status: true,
      community_id: true,
    },
  });

  if (!post) {
    throw new HttpException("Associated post not found", 404);
  }

  // Fetch related citizen to populate citizen summary
  const citizen = await MyGlobal.prisma.community_bbs_citizen.findUnique({
    where: { id: updated.citizen_id },
    select: { username: true, nickname: true },
  });

  if (!citizen) {
    throw new HttpException("Associated citizen not found", 404);
  }

  // Return complete object matching ICommunityBBSComment
  return {
    id: updated.id,
    post_id: updated.post_id,
    citizen_id: updated.citizen_id,
    body: updated.body,
    business_status: updated.business_status satisfies string as string as
      | "pending_review"
      | "approved"
      | "rejected"
      | "hidden",
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
    post: {
      id: updated.post_id, // Added missing id property from updated.post_id
      title: post.title,
      created_at: toISOStringSafe(post.created_at),
      status: post.status satisfies string as string as
        | "pending_review"
        | "approved"
        | "rejected"
        | "hidden",
      author: {
        id: updated.citizen_id,
        username: citizen.username,
        nickname: citizen.nickname,
      },
      community: post.community_id,
    },
    citizen: {
      id: updated.citizen_id,
      username: citizen.username,
      nickname: citizen.nickname,
    },
  };
}
