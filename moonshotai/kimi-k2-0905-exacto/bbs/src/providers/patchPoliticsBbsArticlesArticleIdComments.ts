import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IPoliticsBbsComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsComment";
import { IPageIPoliticsBbsComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIPoliticsBbsComment";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function patchPoliticsBbsArticlesArticleIdComments(props: {
  articleId: string & tags.Format<"uuid">;
  body: IPoliticsBbsComment.IRequest;
}): Promise<IPageIPoliticsBbsComment.ISummary> {
  const { articleId, body } = props;

  // Calculate pagination parameters
  const page = body.page;
  const limit = body.limit;
  const skip = (page - 1) * limit;

  // Set sort order
  const orderBy = { [body.sort_by ?? "created_at"]: body.order_by ?? "desc" };

  // Execute queries
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.politics_bbs_comments.findMany({
      where: {
        politics_bbs_article_id: articleId,
        deleted_at: null,
        ...(body.actor_type !== undefined &&
          body.actor_type !== null && {
            actor_type: body.actor_type,
          }),
        ...(body.depth !== undefined &&
          body.depth !== null && {
            depth: body.depth,
          }),
        ...(body.status !== undefined &&
          body.status !== null && {
            status: body.status,
          }),
        ...(body.search !== undefined &&
          body.search !== null && {
            content: { contains: body.search },
          }),
      },
      select: {
        id: true,
        politics_bbs_article_id: true,
        parent_id: true,
        content: true,
        depth: true,
        status: true,
        actor_type: true,
        created_at: true,
      },
      orderBy,
      skip,
      take: limit,
    }),
    MyGlobal.prisma.politics_bbs_comments.count({
      where: {
        politics_bbs_article_id: articleId,
        deleted_at: null,
        ...(body.actor_type !== undefined &&
          body.actor_type !== null && {
            actor_type: body.actor_type,
          }),
        ...(body.depth !== undefined &&
          body.depth !== null && {
            depth: body.depth,
          }),
        ...(body.status !== undefined &&
          body.status !== null && {
            status: body.status,
          }),
        ...(body.search !== undefined &&
          body.search !== null && {
            content: { contains: body.search },
          }),
      },
    }),
  ]);

  // Convert results to summary format
  const summaries: IPoliticsBbsComment.ISummary[] = rows.map((comment) => ({
    id: comment.id as string & tags.Format<"uuid">,
    politics_bbs_article_id: comment.politics_bbs_article_id as string &
      tags.Format<"uuid">,
    parent_id: comment.parent_id as
      | (string & tags.Format<"uuid">)
      | null
      | undefined,
    content: comment.content,
    depth: comment.depth as number & tags.Type<"int32">,
    status: comment.status,
    actor_type: comment.actor_type,
    created_at: toISOStringSafe(comment.created_at),
  }));

  // Build pagination info with proper brand stripping
  const pagination: IPage.IPagination = {
    current: page as number & tags.Type<"int32"> & tags.Minimum<0>,
    limit: limit as number & tags.Type<"int32"> & tags.Minimum<0>,
    records: total as number & tags.Type<"int32"> & tags.Minimum<0>,
    pages: Math.ceil(total / limit),
  };

  return {
    pagination,
    data: summaries,
  };
}
