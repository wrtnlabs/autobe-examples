import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardArticleVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleVersion";
import { IPageIDiscussionBoardArticleVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleVersion";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function patchDiscussionBoardModeratorArticlesArticleIdVersions(props: {
  moderator: ModeratorPayload;
  articleId: string & tags.Format<"uuid">;
  body: IDiscussionBoardArticleVersion.IRequest;
}): Promise<IPageIDiscussionBoardArticleVersion.ISummary> {
  // Check if article exists
  const article = await MyGlobal.prisma.discussion_board_articles.findUnique({
    where: { id: props.articleId },
  });
  if (!article) {
    throw new HttpException("Article not found", 404);
  }

  if (props.body === null) {
    return {
      data: [],
      pagination: {
        current: 1,
        limit: 100,
        records: 0,
        pages: 0,
      },
    };
  }

  const { page = 1, limit = 100, search } = props.body;
  const skip = (+page - 1) * +limit;

  const [data, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_article_versions.findMany({
      where: {
        article_id: props.articleId,
        ...(search !== undefined && {
          OR: [
            { title: { contains: search } },
            { content: { contains: search } },
          ],
        }),
      },
      skip,
      take: +limit,
      orderBy: { created_at: "desc" },
    }),
    MyGlobal.prisma.discussion_board_article_versions.count({
      where: {
        article_id: props.articleId,
        ...(search !== undefined && {
          OR: [
            { title: { contains: search } },
            { content: { contains: search } },
          ],
        }),
      },
    }),
  ]);

  return {
    data: data.map((version) => ({
      id: version.id,
      title: version.title,
      created_at: toISOStringSafe(version.created_at),
    })),
    pagination: {
      current: +page,
      limit: +limit,
      records: total,
      pages: Math.ceil(total / +limit),
    },
  };
}
