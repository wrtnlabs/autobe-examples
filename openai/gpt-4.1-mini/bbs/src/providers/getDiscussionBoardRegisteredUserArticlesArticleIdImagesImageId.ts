import { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RegistereduserPayload } from "../decorators/payload/RegistereduserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardRegisteredUserArticlesArticleIdImagesImageId(props: {
  registeredUser: RegistereduserPayload;
  articleId: string & tags.Format<"uuid">;
  imageId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardArticleImage> {
  const record =
    await MyGlobal.prisma.discussion_board_article_images.findFirst({
      where: {
        id: props.imageId,
        discussion_board_article_id: props.articleId,
        deleted_at: null,
      },
    });
  if (!record) {
    throw new HttpException("Image not found", 404);
  }
  return {};
}
