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
import { UserPayload } from "../decorators/payload/UserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformUserPostsPostIdComments(props: {
  user: UserPayload;
  postId: string & tags.Format<"uuid">;
  body: ICommunityPlatformPostComment.IRequest;
}): Promise<IPageICommunityPlatformPostComment.ISummary> {
  const post = await MyGlobal.prisma.community_platform_posts.findUnique({
    where: { id: props.postId },
  });
  if (!post) throw new HttpException("Post not found", 404);
  const page =
    typeof (props.body as any).page === "number" && (props.body as any).page > 0
      ? (props.body as any).page
      : 1;
  const limit =
    typeof (props.body as any).limit === "number" &&
    (props.body as any).limit > 0
      ? (props.body as any).limit
      : 100;
  const ALLOWED_STRATEGIES = ["best", "new", "controversial"] as const;
  const strategy =
    typeof (props.body as any).strategy === "string" &&
    ALLOWED_STRATEGIES.includes((props.body as any).strategy)
      ? (props.body as any).strategy
      : "best";
  const skip = (page - 1) * limit;
  const commentSorts =
    await MyGlobal.prisma.community_platform_comment_sort_orders.findMany({
      where: {
        strategy,
        comment: {
          post_id: props.postId,
          deleted_at: null,
        },
      },
      orderBy: { sort_value: "desc" },
      select: { community_platform_comment_id: true },
      skip,
      take: limit,
    });
  if (commentSorts.length === 0) {
    return {
      data: [],
      pagination: { current: page, limit, records: 0, pages: 0 },
    };
  }
  const commentIds = commentSorts.map(
    ({ community_platform_comment_id }) => community_platform_comment_id,
  );
  const comments =
    await MyGlobal.prisma.community_platform_post_comments.findMany({
      where: {
        id: { in: commentIds },
        deleted_at: null,
      },
      orderBy: { created_at: "desc" },
      include: {
        user: {
          select: {
            id: true,
          },
        },
        childComments: {
          where: { deleted_at: null },
          orderBy: { created_at: "asc" },
          take: 3,
        },
      },
    });
  const totalCount =
    await MyGlobal.prisma.community_platform_post_comments.count({
      where: {
        post_id: props.postId,
        parent_comment_id: null,
        deleted_at: null,
      },
    });
  const commentMap = new Map<string, (typeof comments)[0]>();
  for (const comment of comments) {
    commentMap.set(comment.id, comment);
  }
  const data = commentIds
    .map((id) => {
      const comment = commentMap.get(id);
      if (!comment) return null;
      const childComments = comment.childComments.map((child) => ({
        id: child.id,
        content_text: child.content_text,
        created_at: toISOStringSafe(child.created_at),
        user_id: child.user_id,
      }));
      return {
        id: comment.id,
        content_text: comment.content_text,
        created_at: toISOStringSafe(comment.created_at),
        updated_at: toISOStringSafe(comment.updated_at),
        user_id: comment.user_id,
        user_profile: {
          id: comment.user.id,
        },
        child_comments: childComments,
      };
    })
    .filter((v): v is NonNullable<typeof v> => v !== null);
  const pages = Math.ceil(totalCount / limit);
  return {
    data,
    pagination: {
      current: page,
      limit,
      records: totalCount,
      pages,
    },
  };
}
