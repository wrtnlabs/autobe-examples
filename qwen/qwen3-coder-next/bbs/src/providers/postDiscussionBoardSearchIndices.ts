import { IDiscussionBoardSearchIndex } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSearchIndex";
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

export async function postDiscussionBoardSearchIndices(props: {
  body: IDiscussionBoardSearchIndex.ICreate;
}): Promise<IDiscussionBoardSearchIndex> {
  // Based on collector, need to get article_id from somewhere
  // The collector expects article object with id field
  // Since ICreate is empty, we need to connect to article via ID
  // However, there's no source for the article ID in ICreate
  // This suggests the ICreate DTO may be incomplete or needs revision
  // For now, implement with placeholder logic
  throw new HttpException(
    "Search index creation requires article reference which is not provided in request",
    400,
  );
}
