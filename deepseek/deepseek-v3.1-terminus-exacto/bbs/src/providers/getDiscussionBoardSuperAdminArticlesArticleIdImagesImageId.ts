import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import { IDiscussionBoardAttachmentFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachmentFile";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperAdminPayload } from "../decorators/payload/SuperAdminPayload";
import { DiscussionBoardArticleFileTransformer } from "../transformers/DiscussionBoardArticleFileTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardSuperAdminArticlesArticleIdImagesImageId(props: {
  superAdmin: SuperAdminPayload;
  articleId: string & tags.Format<"uuid">;
  imageId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardArticleFile> {
  // First verify the article exists
  await MyGlobal.prisma.discussion_board_articles.findUniqueOrThrow({
    where: { id: props.articleId },
  });
  // Retrieve the specific image and verify it belongs to the article
  const image =
    await MyGlobal.prisma.discussion_board_article_images.findUniqueOrThrow({
      where: {
        id: props.imageId,
        discussion_board_article_id: props.articleId,
      },
      ...DiscussionBoardArticleFileTransformer.select(),
    });
  return await DiscussionBoardArticleFileTransformer.transform(image);
}
