import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteDiscussionBoardSuperAdminArticlesArticleIdImagesImageId(props: {
  superAdmin: SuperadminPayload;
  articleId: string & tags.Format<"uuid">;
  imageId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { articleId, imageId } = props;
  // Find image record and verify it belongs to the specified article
  const image = await MyGlobal.prisma.discussion_board_article_images.findFirst(
    {
      where: {
        id: imageId,
        discussion_board_article_id: articleId,
      },
    },
  );
  if (!image) {
    throw new HttpException(
      "Image not found or does not belong to specified article",
      404,
    );
  }
  // Perform deletion
  await MyGlobal.prisma.discussion_board_article_images.delete({
    where: { id: imageId },
  });
}
