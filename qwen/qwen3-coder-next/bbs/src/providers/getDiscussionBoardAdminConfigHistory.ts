import { IDiscussionBoardSystemConfigHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemConfigHistory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardSystemConfigHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSystemConfigHistory";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardAdminConfigHistory(props: {
  admin: AdminPayload;
}): Promise<IPageIDiscussionBoardSystemConfigHistory> {
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  const data =
    await MyGlobal.prisma.discussion_board_system_config_histories.findMany({
      skip,
      take: limit,
      orderBy: { version: "desc" },
    });
  const total =
    await MyGlobal.prisma.discussion_board_system_config_histories.count();
  return {
    data: data.map((record) => ({
      id: record.id as string & tags.Format<"uuid">,
      admin_id:
        record.admin_id === null
          ? undefined
          : (record.admin_id as string & tags.Format<"uuid">),
      version: record.version,
      config_data: record.config_data,
      change_reason: record.change_reason,
      created_at: toISOStringSafe(record.created_at),
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
