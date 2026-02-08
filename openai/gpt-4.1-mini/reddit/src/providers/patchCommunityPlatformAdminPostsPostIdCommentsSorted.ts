import { ICommunityPlatformPostComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostComment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformPostComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPostComment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformAdminPostsPostIdCommentsSorted(props: {
  admin: AdminPayload;
  postId: string & tags.Format<"uuid">;
  body: ICommunityPlatformPostComment.IRequest & {
    page?: number;
    limit?: number;
    sort?: "best" | "new" | "controversial";
  };
}): Promise<IPageICommunityPlatformPostComment.ISummary> {
  const post = await MyGlobal.prisma.community_platform_posts.findUnique({
    where: { id: props.postId },
    select: { id: true },
  });
  if (post === null) {
    throw new HttpException("Post not found", 404);
  }
  const page =
    typeof props.body.page === "number" && props.body.page > 0
      ? props.body.page
      : 1;
  const limit =
    typeof props.body.limit === "number" && props.body.limit > 0
      ? props.body.limit
      : 20;
  const skip = (page - 1) * limit;
  const allowedStrategies = ["best", "new", "controversial"] as const;
  const sortStrategy =
    typeof props.body.sort === "string" &&
    allowedStrategies.includes(props.body.sort)
      ? props.body.sort
      : "best";
  let orderBy:
    | Prisma.community_platform_post_commentsOrderByWithRelationInput
    | Prisma.community_platform_post_commentsOrderByWithRelationInput[];
  switch (sortStrategy) {
    case "new":
      orderBy = { created_at: "desc" };
      break;
    case "controversial":
      orderBy = { created_at: "desc" };
      break;
    case "best":
    default:
      orderBy = { created_at: "desc" };
  }
  const comments =
    await MyGlobal.prisma.community_platform_post_comments.findMany({
      where: {
        post_id: props.postId,
        deleted_at: null,
      },
      orderBy,
      skip,
      take: limit,
      select: {
        id: true,
        post_id: true,
        parent_comment_id: true,
        user_id: true,
        content_text: true,
        created_at: true,
        updated_at: true,
      },
    });
  const total = await MyGlobal.prisma.community_platform_post_comments.count({
    where: {
      post_id: props.postId,
      deleted_at: null,
    },
  });
  return {
    data: comments.map((comment) => ({
      id: comment.id as string & tags.Format<"uuid">,
      post_id: comment.post_id as string & tags.Format<"uuid">,
      parent_id: comment.parent_comment_id ?? null,
      author_id: comment.user_id as string & tags.Format<"uuid">,
      content: comment.content_text,
      created_at: toISOStringSafe(comment.created_at),
      updated_at: toISOStringSafe(comment.updated_at),
      vote_count: 0,
      vote_score: 0,
    })),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    },
  };
}
