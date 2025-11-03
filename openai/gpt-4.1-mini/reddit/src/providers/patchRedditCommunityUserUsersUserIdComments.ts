import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUser";
import { IPageIRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityComment";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function patchRedditCommunityUserUsersUserIdComments(props: {
  user: UserPayload;
  userId: string & tags.Format<"uuid">;
  body: IRedditCommunityUser.IRequest;
}): Promise<IPageIRedditCommunityComment.ISummary> {
  const { userId, body } = props;

  const page = body.page;
  const limit = body.limit;
  const skip = (page - 1) * limit;

  const where: {
    reddit_community_user_id: string & tags.Format<"uuid">;
    body?: { contains: string };
    deleted_at: null;
  } = {
    reddit_community_user_id: userId,
    deleted_at: null,
  };

  if (body.search !== undefined && body.search !== null) {
    where.body = { contains: body.search };
  }

  let orderBy: Record<string, "asc" | "desc">;

  if (
    body.order_by === "created_at" ||
    body.order_by === undefined ||
    body.order_by === null
  ) {
    orderBy = { created_at: body.order_direction === "asc" ? "asc" : "desc" };
  } else {
    orderBy = { created_at: "desc" };
  }

  const [results, total] = await Promise.all([
    MyGlobal.prisma.reddit_community_comments.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      select: {
        id: true,
        body: true,
        created_at: true,
        parent_id: true,
        reddit_community_post_id: true,
        user: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    }),
    MyGlobal.prisma.reddit_community_comments.count({ where }),
  ]);

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: results.map((comment) => ({
      id: comment.id,
      body: comment.body,
      created_at: toISOStringSafe(comment.created_at),
      parent_id: comment.parent_id === null ? undefined : comment.parent_id,
      post_id: comment.reddit_community_post_id,
      author: {
        id: comment.user.id,
        email: comment.user.email,
      },
    })),
  };
}
