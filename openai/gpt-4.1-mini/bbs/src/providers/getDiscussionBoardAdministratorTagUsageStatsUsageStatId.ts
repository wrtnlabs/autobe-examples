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
import { DiscussionBoardMvTagUsageStatTransformer } from "../transformers/DiscussionBoardMvTagUsageStatTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardAdministratorTagUsageStatsUsageStatId(props: {
  administrator: AdministratorPayload;
  usageStatId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardMvTagUsageStat> {
  const record =
    await MyGlobal.prisma.discussion_board_mv_tag_usage_stats.findUniqueOrThrow(
      {
        where: { id: props.usageStatId },
      },
    );
  return await DiscussionBoardMvTagUsageStatTransformer.transform(record);
}
