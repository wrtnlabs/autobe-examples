import { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleImage";
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

export async function getDiscussionBoardAdminArticlesArticleIdImages(props: {
  admin: AdminPayload;
  articleId: string;
}): Promise<IPageIDiscussionBoardArticleImage.ISummary> {
  const page = 1; // Default page
  const limit = 100; // Default limit
  const skip = (page - 1) * limit;
  const images = await MyGlobal.prisma.discussion_board_article_images.findMany(
    {
      where: {
        discussion_board_article_id: props.articleId,
        article: {
          deleted_at: null,
        },
      },
      skip,
      take: limit,
      orderBy: { display_order: "asc" },
      select: {
        id: true,
        original_filename: true,
        stored_filename: true,
        mime_type: true,
        size: true,
        width: true,
        height: true,
        display_order: true,
      },
    },
  );
  const total = await MyGlobal.prisma.discussion_board_article_images.count({
    where: {
      discussion_board_article_id: props.articleId,
      article: {
        deleted_at: null,
      },
    },
  });
  const data = images.map((image) => ({
    id: image.id,
    original_filename: image.original_filename,
    stored_filename: image.stored_filename,
    mime_type: image.mime_type,
    size: image.size,
    width: image.width,
    height: image.height,
    display_order: image.display_order,
  }));
  return {
    data,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
