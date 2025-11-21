import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { CitizenPayload } from "../decorators/payload/CitizenPayload";

export async function deleteCommunityBBSCitizenCommentsCommentId(props: {
  citizen: CitizenPayload;
  commentId: string;
}): Promise<void> {
  const comment = await MyGlobal.prisma.community_bbs_comments.findUnique({
    where: { id: props.commentId },
  });

  if (!comment) {
    throw new HttpException("Comment not found", 404);
  }

  // Check if citizen is owner OR has moderator/admin privilege
  const isOwner = comment.citizen_id === props.citizen.id;
  let isAuthorized = isOwner;

  // If not owner, check if user has admin or moderator role
  if (!isOwner) {
    const userRole = await MyGlobal.prisma.community_bbs_admin.findFirst({
      where: { id: props.citizen.id },
    });
    if (userRole) {
      isAuthorized = true;
    }

    if (!isAuthorized) {
      const moderator = await MyGlobal.prisma.community_bbs_moderator.findFirst(
        {
          where: { id: props.citizen.id },
        },
      );
      if (moderator) {
        isAuthorized = true;
      }
    }
  }

  if (!isAuthorized) {
    throw new HttpException("Forbidden", 403);
  }

  // Already deleted
  if (comment.deleted_at !== null) {
    return;
  }

  // Update comment with deleted_at timestamp
  await MyGlobal.prisma.community_bbs_comments.update({
    where: { id: props.commentId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });

  // Create snapshot of the comment before deletion
  await MyGlobal.prisma.community_bbs_comment_snapshots.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      comment_id: comment.id,
      editor_id: props.citizen.id,
      body: comment.body,
      business_status: comment.business_status,
      created_at: toISOStringSafe(comment.created_at),
      updated_at: toISOStringSafe(comment.updated_at),
      deleted_at: toISOStringSafe(new Date()),
    },
  });
}
