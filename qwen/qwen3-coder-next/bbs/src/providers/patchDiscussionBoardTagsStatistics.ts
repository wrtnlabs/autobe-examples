import { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
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

export async function patchDiscussionBoardTagsStatistics(): Promise<
  IDiscussionBoardTag.IStatistic[]
> {
  const tagsWithStats = await MyGlobal.prisma.discussion_board_tags.findMany({
    select: {
      id: true,
      tag_name: true,
      created_at: true,
    },
  });
  const totalTagCount = tagsWithStats.length;
  return tagsWithStats.map((tag) => ({
    id: tag.id,
    tagName: tag.tag_name,
    articleCount: 0 satisfies number as number,
    usageRate:
      totalTagCount > 0
        ? ((0 satisfies number as number) / totalTagCount) * 100
        : 0,
    createdAt: toISOStringSafe(tag.created_at),
  }));
}
