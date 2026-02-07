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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardMemberArticlesArticleIdImages(props: {
  member: MemberPayload;
  articleId: string;
}): Promise<IPageIDiscussionBoardArticleImage.ISummary> {
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  const images = await MyGlobal.prisma.discussion_board_article_images.findMany(
    {
      where: {
        discussion_board_article_id: props.articleId,
      },
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
      skip,
      take: limit,
      orderBy: { display_order: "asc" },
    },
  );
  const total = await MyGlobal.prisma.discussion_board_article_images.count({
    where: {
      discussion_board_article_id: props.articleId,
    },
  });
  return {
    data: images.map((image) => ({
      id: image.id,
      original_filename: image.original_filename,
      stored_filename: image.stored_filename,
      mime_type: image.mime_type,
      size: image.size,
      width: image.width,
      height: image.height,
      display_order: image.display_order,
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
