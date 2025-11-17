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

export async function patchCommunityForumCommentsCommentIdReplies(props: {
  commentId: string & tags.Format<"uuid">;
  body: ICommunityForumPostComment.IRequest;
}): Promise<IPageICommunityForumPostComment.ISummary> {
  // Validate parent comment exists
  const parentComment =
    await MyGlobal.prisma.community_forum_comments.findUnique({
      where: { id: props.commentId },
    });

  if (!parentComment) {
    throw new HttpException("Parent comment not found", 404);
  }

  // Set up pagination
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;

  // Build where condition for replies
  const whereCondition: Prisma.community_forum_commentsWhereInput = {
    parent_id: props.commentId,
    deleted_at: null, // Exclude deleted comments by default
  };

  // Apply deletion filter if specified
  if (props.body.deleted !== undefined) {
    if (props.body.deleted) {
      whereCondition.deleted_at = { not: null };
    } else {
      whereCondition.deleted_at = null;
    }
  }

  // Apply time range filters
  if (props.body.before || props.body.after) {
    whereCondition.created_at = {};
    if (props.body.before) {
      (whereCondition.created_at as Prisma.DateTimeFilter).lte =
        props.body.before;
    }
    if (props.body.after) {
      (whereCondition.created_at as Prisma.DateTimeFilter).gte =
        props.body.after;
    }
  }

  // Apply author filter if specified
  if (props.body.author) {
    const author = await MyGlobal.prisma.community_forum_users.findUnique({
      where: { username: props.body.author },
    });

    if (author) {
      whereCondition.community_forum_user_id = author.id;
    } else {
      // If author not found, return empty results
      return {
        pagination: {
          current: page,
          limit: limit,
          records: 0,
          pages: 0,
        },
        data: [],
      };
    }
  }

  // Apply search filter if specified
  if (props.body.search) {
    whereCondition.body = {
      contains: props.body.search,
      mode: "insensitive",
    };
  }

  // Determine sort order
  let orderBy: Prisma.community_forum_commentsOrderByWithRelationInput;
  switch (props.body.sort) {
    case "top":
      // For top sort, we would need to implement vote scoring logic
      // Since vote data is in separate tables, this would require joins
      orderBy = { created_at: "desc" };
      break;
    case "controversial":
      // For controversial sort, we would need to implement scoring logic
      // This is a placeholder implementation
      orderBy = { created_at: "desc" };
      break;
    case "new":
    default:
      orderBy = { created_at: "desc" };
  }

  // Fetch paginated replies and total count
  const [replies, total] = await Promise.all([
    MyGlobal.prisma.community_forum_comments.findMany({
      where: whereCondition,
      skip: skip,
      take: limit,
      orderBy: orderBy,
      include: {
        author: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    }),
    MyGlobal.prisma.community_forum_comments.count({
      where: whereCondition,
    }),
  ]);

  // Transform replies to match the response structure
  const data = replies.map((reply) => ({
    id: reply.id,
    body: reply.body,
    created_at: toISOStringSafe(reply.created_at),
    updated_at: toISOStringSafe(reply.updated_at),
    author: {
      id: reply.author.id,
      username: reply.author.username,
    },
  }));

  // Calculate pagination info
  const pages = Math.ceil(total / limit);

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: pages,
    },
    data: data,
  };
}
