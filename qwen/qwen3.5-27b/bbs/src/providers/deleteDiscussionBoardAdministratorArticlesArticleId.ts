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

export async function deleteDiscussionBoardAdministratorArticlesArticleId(props: {
  administrator: AdministratorPayload;
  articleId: string & tags.Format<"uuid">;
}): Promise<void> {
  await MyGlobal.prisma.discussion_board_articles.findUniqueOrThrow({
    where: { id: props.articleId },
  });
  await MyGlobal.prisma.discussion_board_articles.update({
    where: { id: props.articleId },
    data: {
      deleted_at: new Date(),
    },
  });
}
