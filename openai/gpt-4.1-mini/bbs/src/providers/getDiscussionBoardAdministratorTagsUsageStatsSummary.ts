import { IDiscussionBoardMvTagUsageStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMvTagUsageStat";
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

export async function getDiscussionBoardAdministratorTagsUsageStatsSummary(props: {
  administrator: AdministratorPayload;
}): Promise<IDiscussionBoardMvTagUsageStat[]> {
  try {
    const usageStats =
      await MyGlobal.prisma.discussion_board_mv_tag_usage_stats.findMany();
    return usageStats;
  } catch (error) {
    throw new HttpException(
      `Failed to retrieve tag usage stats summary: ${error instanceof Error ? error.message : String(error)}`,
      500,
    );
  }
}
