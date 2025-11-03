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
import { UserPayload } from "../decorators/payload/UserPayload";

export async function patchRedditCommunityUserCommunitiesCommunityNamePostsPostIdComments(props: {
  user: UserPayload;
  communityName: string;
  postId: string & tags.Format<"uuid">;
  body: IRedditCommunityComment.IRequest;
}): Promise<IPageIRedditCommunityComment.ISummary> {
  const { user, communityName, postId, body } = props;

  const page = (body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const limit = (body.limit ?? 10) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const skip = (page - 1) * limit;

  const [comments, total] = await Promise.all([
    MyGlobal.prisma.reddit_community_comments.findMany({
      where: {
        deleted_at: null,
        reddit_community_post_id: postId,
        ...(body.search !== undefined &&
          body.search !== null && {
            body: { contains: body.search },
          }),
      },
      orderBy: {
        [body.sort === "updated_at" ? "updated_at" : "created_at"]:
          body.order === "asc" ? "asc" : "desc",
      },
      skip,
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    }),
    MyGlobal.prisma.reddit_community_comments.count({
      where: {
        deleted_at: null,
        reddit_community_post_id: postId,
        ...(body.search !== undefined &&
          body.search !== null && {
            body: { contains: body.search },
          }),
      },
    }),
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
      author: {
        id: comment.user.id,
        email: comment.user.email,
      },
      post_id: comment.reddit_community_post_id,
      parent_id: comment.parent_id ?? null,
      created_at: toISOStringSafe(comment.created_at),
    })),
  };
}
