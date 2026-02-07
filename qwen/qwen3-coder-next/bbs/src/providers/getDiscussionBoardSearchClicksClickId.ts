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

export async function getDiscussionBoardSearchClicksClickId(props: {
  clickId: string;
}): Promise<void> {
  throw new HttpException(
    "Individual search click records are not accessible. Search click tracking is an internal analytics system that automatically records user interactions with search results for relevance ranking and search analytics.",
    404,
  );
}
