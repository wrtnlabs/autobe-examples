import { IDiscussionBoardMvTagUsageStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMvTagUsageStat";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadministratorPayload } from "../decorators/payload/SuperadministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardSuperAdministratorTagsUsageStatsSummary(props: {
  superAdministrator: SuperadministratorPayload;
}): Promise<IDiscussionBoardMvTagUsageStat.ISummary> {
  try {
    const summaries =
      await MyGlobal.prisma.discussion_board_mv_tag_usage_stats.findMany();
    return summaries;
  } catch (error) {
    throw new HttpException("Internal server error", 500);
  }
}
