import { IDiscussionBoardSystemConfigHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemConfigHistory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function getDiscussionBoardAdminConfigHistoryHistoryId(props: {
  admin: AdminPayload;
  historyId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardSystemConfigHistory> {
  const history =
    await MyGlobal.prisma.discussion_board_system_config_histories.findUnique({
      where: {
        id: props.historyId,
      },
      select: {
        id: true,
        admin_id: true,
        version: true,
        config_data: true,
        change_reason: true,
        created_at: true,
      },
    });
  if (!history) {
    throw new HttpException("Configuration history not found", 404);
  }
  return {
    id: history.id as string & tags.Format<"uuid">,
    admin_id: history.admin_id as (string & tags.Format<"uuid">) | null,
    version: history.version,
    config_data: history.config_data,
    change_reason: history.change_reason,
    created_at: toISOStringSafe(history.created_at) as string &
      tags.Format<"date-time">,
  };
}
