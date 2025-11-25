import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import { IPageIRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityComment";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IRedditCommunityRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityRegisteredUser";

export async function patchRedditCommunityRedditCommunityPostsPostIdComments(props: {
  postId: string & tags.Format<"uuid">;
  body: IRedditCommunityComment.IRequest;
}): Promise<IPageIRedditCommunityComment.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;

  const where: Prisma.reddit_community_commentsWhereInput = {
    reddit_community_post_id: props.postId,
    ...(props.body.filter_deleted === false ? { deleted_at: null } : {}),
    ...(props.body.filter_deleted === true
      ? { NOT: { deleted_at: null } }
      : {}),
    ...(props.body.parent_comment_id !== undefined &&
    props.body.parent_comment_id !== null
      ? { parent_id: props.body.parent_comment_id }
      : {}),
    ...(props.body.author_id !== undefined && props.body.author_id !== null
      ? { reddit_community_registereduser_id: props.body.author_id }
      : {}),
    ...(props.body.created_after || props.body.created_before
      ? {
          created_at: {
            ...(props.body.created_after && { gte: props.body.created_after }),
            ...(props.body.created_before && {
              lte: props.body.created_before,
            }),
          },
        }
      : {}),
    ...(props.body.search
      ? {
          body: { contains: props.body.search },
        }
      : {}),
  };

  let orderBy: Prisma.reddit_community_commentsOrderByWithRelationInput = {
    created_at: "asc",
  };

  if (props.body.sort_by === "created_at") {
    orderBy = { created_at: props.body.order ?? "asc" };
  }

  const [comments, total] = await Promise.all([
    MyGlobal.prisma.reddit_community_comments.findMany({
      where,
      skip,
      take: limit satisfies number as number,
      orderBy,
      include: {
        registeredUser: true,
      },
    }),
    MyGlobal.prisma.reddit_community_comments.count({ where }),
  ]);

  return {
    pagination: {
      current: page satisfies number as number,
      limit: limit satisfies number as number,
      records: total satisfies number as number,
      pages: Math.ceil(total / limit) satisfies number as number,
    },
    data: comments.map((item) => ({
      id: item.id,
      content_snippet:
        item.body.length > 80 ? item.body.slice(0, 77) + "..." : item.body,
      created_at: toISOStringSafe(item.created_at),
      author: {
        id: item.registeredUser.id,
        email: item.registeredUser.email,
        created_at: toISOStringSafe(item.registeredUser.created_at),
        updated_at: toISOStringSafe(item.registeredUser.updated_at),
        deleted_at: item.registeredUser.deleted_at
          ? toISOStringSafe(item.registeredUser.deleted_at)
          : null,
      },
    })),
  };
}
