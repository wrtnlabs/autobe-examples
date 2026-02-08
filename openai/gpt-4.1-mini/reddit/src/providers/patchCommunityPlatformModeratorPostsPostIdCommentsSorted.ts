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
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformModeratorPostsPostIdCommentsSorted(props: {
  moderator: ModeratorPayload;
  postId: string & tags.Format<"uuid">;
  body: ICommunityPlatformPostComment.IRequest;
}): Promise<IPageICommunityPlatformPostComment.ISummary> {
  const { postId, body } = props;
  const post = await MyGlobal.prisma.community_platform_posts.findFirst({
    where: { id: postId, deleted_at: null },
    select: { id: true },
  });
  if (!post) throw new HttpException("Post not found", 404);
  const validStrategies = ["best", "new", "controversial"] as const;
  const rawStrategy = (body as any).strategy ?? "best";
  const strategy = validStrategies.includes(rawStrategy) ? rawStrategy : "best";
  const rawPage = (body as any).page ?? 1;
  const page = typeof rawPage === "number" && rawPage > 0 ? rawPage : 1;
  const rawLimit = (body as any).limit ?? 20;
  const limit =
    typeof rawLimit === "number" && rawLimit > 0 ? Math.min(rawLimit, 100) : 20;
  const skip = (page - 1) * limit;
  const commentsWhere = {
    post_id: postId,
    deleted_at: null,
  };
  const comments =
    await MyGlobal.prisma.community_platform_post_comments.findMany({
      where: commentsWhere,
      skip,
      take: limit,
      orderBy: [{ created_at: "desc" }],
      select: {
        id: true,
        post_id: true,
        user_id: true,
        parent_comment_id: true,
        content_text: true,
        created_at: true,
        updated_at: true,
      },
    });
  const total = await MyGlobal.prisma.community_platform_post_comments.count({
    where: commentsWhere,
  });
  const data = comments.map((c) => ({
    id: c.id,
    post_id: c.post_id,
    user_id: c.user_id,
    parent_comment_id: c.parent_comment_id,
    content_text: c.content_text,
    created_at: toISOStringSafe(c.created_at),
    updated_at: toISOStringSafe(c.updated_at),
  }));
  return {
    data,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
