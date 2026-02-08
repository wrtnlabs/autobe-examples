import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteDiscussionBoardAdministratorArticlesArticleIdImagesImageId(props: {
  administrator: AdministratorPayload;
  articleId: string & tags.Format<"uuid">;
  imageId: string & tags.Format<"uuid">;
}): Promise<void> {
  const image = await MyGlobal.prisma.discussion_board_article_images.findFirst(
    {
      where: {
        id: props.imageId,
        discussion_board_article_id: props.articleId,
        deleted_at: null,
      },
    },
  );
  if (image === null) {
    throw new HttpException("Image not found", 404);
  }
  await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.discussion_board_article_images.delete({
      where: { id: props.imageId },
    }),
  ]);
}
