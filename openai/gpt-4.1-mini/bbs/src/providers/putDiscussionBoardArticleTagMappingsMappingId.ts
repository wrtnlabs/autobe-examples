import { IDiscussionBoardArticleTagMapping } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTagMapping";
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

export async function putDiscussionBoardArticleTagMappingsMappingId(props: {
  mappingId: string & tags.Format<"uuid">;
  body: IDiscussionBoardArticleTagMapping.IUpdate;
}): Promise<IDiscussionBoardArticleTagMapping> {
  // Check existence of the mapping
  const mapping =
    await MyGlobal.prisma.discussion_board_article_tag_mappings.findUnique({
      where: { id: props.mappingId },
    });
  if (!mapping) throw new HttpException("Article tag mapping not found", 404);
  // No update to perform since body is empty, so return the found record
  return mapping;
}
