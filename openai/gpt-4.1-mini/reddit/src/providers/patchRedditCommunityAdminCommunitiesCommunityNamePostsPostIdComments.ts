import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import { IPageIRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityComment";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IRedditCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUser";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchRedditCommunityAdminCommunitiesCommunityNamePostsPostIdComments(props: {
  admin: AdminPayload;
  communityName: string;
  postId: string & tags.Format<"uuid">;
  body: IRedditCommunityComment.IRequest;
}): Promise<IPageIRedditCommunityComment.ISummary> {
  const { admin, communityName, postId, body } = props;

  const pageRaw = body.page ?? 1;
  const limitRaw = body.limit ?? 10;

  const page = pageRaw as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const limit = limitRaw as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const skip = (page - 1) * limit;

  const whereCondition = {
    reddit_community_post_id: postId,
    post: {
      community: {
        name: communityName,
      },
    },
    deleted_at: null,
    ...(body.search !== undefined &&
      body.search !== null && {
        body: { contains: body.search },
      }),
  };

  const sortField =
    body.sort === "created_at" || body.sort === "updated_at"
      ? body.sort
      : "created_at";
  const sortOrder = body.order === "asc" ? "asc" : "desc";

  const [comments, total] = await Promise.all([
    MyGlobal.prisma.reddit_community_comments.findMany({
      where: whereCondition,
      include: {
        user: {
          select: {
            id: true,
            email: true,
          },
        },
      },
      orderBy: {
        [sortField]: sortOrder,
      },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.reddit_community_comments.count({ where: whereCondition }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: comments.map((comment) => ({
      id: comment.id,
      body: comment.body,
      post_id: comment.reddit_community_post_id,
      parent_id: comment.parent_id ?? undefined,
      created_at: toISOStringSafe(comment.created_at),
      author: {
        id: comment.user.id,
        email: comment.user.email,
      },
    })),
  };
}
