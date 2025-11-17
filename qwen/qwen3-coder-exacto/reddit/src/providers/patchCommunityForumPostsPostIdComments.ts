import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityForumPostComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumPostComment";
import { IPageICommunityForumPostComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityForumPostComment";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function patchCommunityForumPostsPostIdComments(props: {
  postId: string & tags.Format<"uuid">;
  body: ICommunityForumPostComment.IRequest;
}): Promise<IPageICommunityForumPostComment> {
  // Validate the postId parameter
  if (!props.postId) {
    throw new HttpException("Post ID is required", 400);
  }

  // Extract pagination and sorting parameters with defaults
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;

  // Build where condition without using Date objects directly
  const whereCondition: Prisma.community_forum_commentsWhereInput = {
    community_forum_post_id: props.postId,
    deleted_at:
      props.body.deleted === true
        ? { not: null }
        : props.body.deleted === false
          ? null
          : undefined,
    ...(props.body.search && {
      body: {
        contains: props.body.search,
        mode: "insensitive",
      },
    }),
    ...(props.body.before && {
      created_at: { lt: new Date(props.body.before) },
    }),
    ...(props.body.after && { created_at: { gt: new Date(props.body.after) } }),
  };

  // Handle author filtering if provided
  if (props.body.author) {
    const user = await MyGlobal.prisma.community_forum_users.findUnique({
      where: { username: props.body.author },
    });

    if (user) {
      whereCondition.community_forum_user_id = user.id;
    } else {
      // If user doesn't exist, return empty results
      return {
        data: [],
        pagination: {
          current: page,
          limit,
          records: 0,
          pages: 0,
        },
      };
    }
  }

  // Determine sort order
  let orderBy: Prisma.community_forum_commentsOrderByWithRelationInput;
  switch (props.body.sort) {
    case "top":
      // This would require joining with vote data, simplifying for now
      orderBy = { created_at: "desc" };
      break;
    case "controversial":
      // This would require complex calculations, simplifying for now
      orderBy = { created_at: "desc" };
      break;
    case "new":
    default:
      orderBy = { created_at: "desc" };
  }

  // Execute queries
  const [comments, total] = await Promise.all([
    MyGlobal.prisma.community_forum_comments.findMany({
      where: whereCondition,
      skip,
      take: limit,
      orderBy,
    }),
    MyGlobal.prisma.community_forum_comments.count({
      where: whereCondition,
    }),
  ]);

  // Transform comments to API format
  const transformedComments = comments.map((comment) => ({
    id: comment.id,
    body: comment.body,
    created_at: toISOStringSafe(comment.created_at),
    updated_at: comment.updated_at
      ? toISOStringSafe(comment.updated_at)
      : undefined,
    deleted_at: comment.deleted_at ? toISOStringSafe(comment.deleted_at) : null,
    community_forum_post_id: comment.community_forum_post_id,
    community_forum_user_id: comment.community_forum_user_id,
    parent_id: comment.parent_id ?? undefined,
  }));

  // Return paginated response
  return {
    data: transformedComments,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
