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

export async function getCommunityBBSPostsPostIdCommentsCommentId(props: {
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
}): Promise<ICommunityBBSComment> {
  const comment = await MyGlobal.prisma.community_bbs_comments.findUnique({
    where: {
      id: props.commentId,
      post_id: props.postId,
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
              name: true,
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
    throw new HttpException("Comment not found", 404);
  }

  return {
    id: comment.id,
    post_id: comment.post_id,
    citizen_id: comment.citizen_id,
    body: comment.body,
    business_status: comment.business_status satisfies string as
      | "pending_review"
      | "approved"
      | "rejected"
      | "hidden",
    created_at: toISOStringSafe(comment.created_at),
    updated_at: toISOStringSafe(comment.updated_at),
    deleted_at: comment.deleted_at
      ? toISOStringSafe(comment.deleted_at)
      : undefined,
    post: {
      id: comment.post.id,
      title: comment.post.title,
      created_at: toISOStringSafe(comment.post.created_at),
      status: comment.post.status,
      author: {
        id: comment.post.citizen.id,
        username: comment.post.citizen.username,
        nickname: comment.post.citizen.nickname,
      },
      community: comment.post.community.name,
    },
    citizen: {
      id: comment.citizen.id,
      username: comment.citizen.username,
      nickname: comment.citizen.nickname,
    },
  };
}
