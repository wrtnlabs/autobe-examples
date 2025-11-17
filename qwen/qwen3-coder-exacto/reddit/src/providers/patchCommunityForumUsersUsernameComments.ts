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
import { ICommunityForumCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityUser";

export async function patchCommunityForumUsersUsernameComments(props: {
  username: string;
  body: ICommunityForumPostComment.IRequest;
}): Promise<IPageICommunityForumPostComment.ISummary> {
  // Find user by username
  const user = await MyGlobal.prisma.community_forum_users.findUnique({
    where: { username: props.username },
  });

  if (!user) {
    throw new HttpException("User not found", 404);
  }

  // Build where conditions inline
  const whereCondition: Prisma.community_forum_commentsWhereInput = {
    community_forum_user_id: user.id,
    ...(props.body.deleted !== undefined && {
      deleted_at: props.body.deleted ? { not: null } : null,
    }),
    ...(props.body.before || props.body.after
      ? {
          created_at: {
            ...(props.body.before && { lte: props.body.before }),
            ...(props.body.after && { gte: props.body.after }),
          },
        }
      : {}),
    ...(props.body.search && {
      body: {
        contains: props.body.search,
        mode: Prisma.QueryMode.insensitive,
      },
    }),
  };

  // Set pagination
  const page = props.body.page || 1;
  const limit = props.body.limit || 20;
  const skip = (page - 1) * limit;

  // Determine sorting
  let orderBy: Prisma.community_forum_commentsOrderByWithRelationInput;
  switch (props.body.sort) {
    case "top":
      orderBy = { created_at: "desc" }; // Simplified - would need vote count in real implementation
      break;
    case "controversial":
      orderBy = { created_at: "asc" }; // Simplified - would need specific logic
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
      include: {
        author: true,
      },
    }),
    MyGlobal.prisma.community_forum_comments.count({ where: whereCondition }),
  ]);

  // Transform to API format
  const data = comments.map((comment) => ({
    id: comment.id,
    body: comment.body,
    created_at: toISOStringSafe(comment.created_at),
    updated_at: toISOStringSafe(comment.updated_at),
    author: {
      id: comment.author.id,
      username: comment.author.username,
    },
  }));

  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
