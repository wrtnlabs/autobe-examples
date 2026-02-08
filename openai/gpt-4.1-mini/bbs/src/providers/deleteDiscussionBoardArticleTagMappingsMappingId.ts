import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteDiscussionBoardArticleTagMappingsMappingId(props: {
  mappingId: string & tags.Format<"uuid">;
}): Promise<void> {
  const record =
    await MyGlobal.prisma.discussion_board_article_tag_mappings.findUnique({
      where: { id: props.mappingId },
    });
  if (!record) throw new HttpException("Mapping not found", 404);
  await MyGlobal.prisma.discussion_board_article_tag_mappings.delete({
    where: { id: props.mappingId },
  });
}
