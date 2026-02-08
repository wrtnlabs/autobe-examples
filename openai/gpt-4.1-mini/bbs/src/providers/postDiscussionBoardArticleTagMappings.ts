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

export async function postDiscussionBoardArticleTagMappings(props: {
  body: IDiscussionBoardArticleTagMapping.ICreate;
}): Promise<IDiscussionBoardArticleTagMapping> {
  // The ICreate DTO is empty according to the type definition, meaning no properties are defined on 'body'.
  // However, the operation requires article ID and tag ID in the request body to create the mapping.
  // Since these are missing, it is ambiguous how to proceed.
  // Without articleId and tagId, creation cannot happen.
  // Therefore, we throw an error indicating missing required identifiers.
  throw new HttpException(
    "articleId and tagId are required but missing in the request body.",
    400,
  );
}
