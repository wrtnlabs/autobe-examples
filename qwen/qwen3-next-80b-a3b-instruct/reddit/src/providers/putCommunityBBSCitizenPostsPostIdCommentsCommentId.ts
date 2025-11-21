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

export async function putCommunityBBSCitizenPostsPostIdCommentsCommentId(props: {
  citizen: CitizenPayload;
  postId: string;
  commentId: string;
  body: ICommunityBBSComment.IUpdate;
}): Promise<ICommunityBBSComment> {
  const comment = await MyGlobal.prisma.community_bbs_comments.findUnique({
    where: {
      id: props.commentId,
      post_id: props.postId,
      citizen_id: props.citizen.id,
      deleted_at: null,
    },
    include: {
      post: {
        select: {
          id: true,
          title: true,
          created_at: true,
          status: true,
          citizen: {
            select: {
              id: true,
              username: true,
              nickname: true,
            },
          },
          community: {
            select: {
              id: true,
            },
          },
        },
      },
      citizen: {
        select: {
          id: true,
          username: true,
          nickname: true,
        },
      },
    },
  });

  if (!comment) {
    throw new HttpException("Comment not found or access denied", 404);
  }

  // Check 24-hour edit window: updated_at - created_at <= 24 hours
  const created = new Date(comment.created_at);
  const updated = new Date(comment.updated_at);
  const editWindow = 24 * 60 * 60 * 1000; // 24 hours in ms

  if (updated.getTime() - created.getTime() > editWindow) {
    throw new HttpException("Comment cannot be edited after 24 hours", 403);
  }

  const updatedComment = await MyGlobal.prisma.community_bbs_comments.update({
    where: { id: props.commentId },
    data: {
      body: props.body.body ?? comment.body,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  return {
    id: updatedComment.id,
    post_id: updatedComment.post_id,
    citizen_id: updatedComment.citizen_id,
    body: updatedComment.body,
    business_status: typia.assert<ICommunityBBSComment["business_status"]>(
      updatedComment.business_status,
    ),
    created_at: toISOStringSafe(updatedComment.created_at),
    updated_at: toISOStringSafe(updatedComment.updated_at),
    deleted_at:
      updatedComment.deleted_at === null
        ? null
        : toISOStringSafe(updatedComment.deleted_at),
    post: {
      id: comment.post.id,
      title: comment.post.title,
      created_at: toISOStringSafe(comment.post.created_at),
      status: comment.post.status,
      author: {
        id: comment.post.citizen.id,
        username: comment.post.citizen.username,
        nickname:
          comment.post.citizen.nickname === null
            ? null
            : comment.post.citizen.nickname,
      },
      community: comment.post.community.id,
    },
    citizen: {
      id: comment.citizen.id,
      username: comment.citizen.username,
      nickname:
        comment.citizen.nickname === null ? null : comment.citizen.nickname,
    },
  };
}
