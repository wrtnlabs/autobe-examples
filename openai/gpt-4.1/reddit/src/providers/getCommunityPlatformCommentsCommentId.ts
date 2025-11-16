import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { ICommunityPlatformUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserSession";

export async function getCommunityPlatformCommentsCommentId(props: {
  commentId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformComment> {
  const comment = await MyGlobal.prisma.community_platform_comments.findUnique({
    where: { id: props.commentId },
    include: {
      post: {
        select: {
          id: true,
          community_id: true,
          user_id: true,
          // We need nested: community (summary) and user (summary)
          community: {
            select: {
              id: true,
              name: true,
              display_title: true,
              description: true,
              visibility: true,
              image_url: true,
              status: true,
            },
          },
          user: {
            select: {
              id: true,
            },
          },
        },
      },
      user: {
        select: {
          id: true,
        },
      },
      userSession: {
        select: {
          id: true,
          created_at: true,
        },
      },
      parent: {
        select: {
          id: true,
          user: { select: { id: true } },
          post: {
            select: {
              id: true,
              community_id: true,
              user_id: true,
              community: {
                select: {
                  id: true,
                  name: true,
                  display_title: true,
                  description: true,
                  visibility: true,
                  image_url: true,
                  status: true,
                },
              },
              user: {
                select: {
                  id: true,
                },
              },
            },
          },
          created_at: true,
          parent_id: true, // Needed for summary
        },
      },
    },
  });

  if (!comment) {
    throw new HttpException("Comment not found", 404);
  }

  // Check soft delete (hide for ordinary users)
  // Since this endpoint is unauthenticated in the operation, we always honor deleted_at

  const postSummary =
    comment.post == null
      ? undefined
      : {
          id: comment.post.id,
          community_id: comment.post.community_id,
          community: comment.post.community && {
            id: comment.post.community.id,
            name: comment.post.community.name,
            display_title: comment.post.community.display_title,
            description: comment.post.community.description,
            visibility: comment.post.community.visibility,
            image_url: comment.post.community.image_url ?? undefined,
            status: comment.post.community.status,
          },
          user_id: comment.post.user_id,
          user: comment.post.user && {
            id: comment.post.user.id,
          },
        };

  const parentSummary = comment.parent
    ? {
        id: comment.parent.id,
        user: { id: comment.parent.user.id },
        post: {
          id: comment.parent.post.id,
          community_id: comment.parent.post.community_id,
          community: comment.parent.post.community && {
            id: comment.parent.post.community.id,
            name: comment.parent.post.community.name,
            display_title: comment.parent.post.community.display_title,
            description: comment.parent.post.community.description,
            visibility: comment.parent.post.community.visibility,
            image_url: comment.parent.post.community.image_url ?? undefined,
            status: comment.parent.post.community.status,
          },
          user_id: comment.parent.post.user_id,
          user: comment.parent.post.user && { id: comment.parent.post.user.id },
        },
        parent_id: comment.parent.parent_id ?? undefined,
        created_at: toISOStringSafe(comment.parent.created_at),
      }
    : undefined;

  return {
    id: comment.id,
    post: postSummary!,
    author: { id: comment.user.id },
    userSession: {
      id: comment.userSession.id,
      created_at: toISOStringSafe(comment.userSession.created_at) as string &
        tags.Format<"date-time">,
    },
    parent: typeof parentSummary !== "undefined" ? parentSummary : undefined,
    body: comment.body,
    deleted_at:
      typeof comment.deleted_at !== "undefined" && comment.deleted_at !== null
        ? toISOStringSafe(comment.deleted_at)
        : undefined,
    created_at: toISOStringSafe(comment.created_at),
    updated_at: toISOStringSafe(comment.updated_at),
  };
}
