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

export async function getCommunityBBSCommentsCommentId(props: {
  citizen: CitizenPayload;
  commentId: string & tags.Format<"uuid">;
}): Promise<ICommunityBBSComment> {
  const comment = await MyGlobal.prisma.community_bbs_comments.findUnique({
    where: { id: props.commentId },
    include: {
      post: {
        select: {
          id: true,
          title: true,
          created_at: true,
          status: true,
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
    business_status: comment.business_status as any as
      | "pending_review"
      | "approved"
      | "rejected"
      | "hidden",
    created_at: toISOStringSafe(comment.created_at),
    updated_at: toISOStringSafe(comment.updated_at),
    deleted_at:
      comment.deleted_at === null ? null : toISOStringSafe(comment.deleted_at),
    post: {
      id: comment.post?.id,
      title: comment.post?.title,
      created_at: toISOStringSafe(comment.post?.created_at),
      status: comment.post?.status as any as
        | "pending_review"
        | "approved"
        | "rejected"
        | "hidden",
      author: {
        id: comment.citizen?.id,
        username: comment.citizen?.username,
        nickname: comment.citizen?.nickname,
      },
      community: comment.post?.community?.name,
    },
    citizen: {
      id: comment.citizen?.id,
      username: comment.citizen?.username,
      nickname: comment.citizen?.nickname,
    },
  };
}
