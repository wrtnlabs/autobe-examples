import { IDiscussionBoardSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemSetting";
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

export async function getDiscussionBoardAdminSettings(props: {
  admin: AdminPayload;
}): Promise<IDiscussionBoardSystemSetting[]> {
  const settings =
    await MyGlobal.prisma.discussion_board_system_settings.findMany({
      where: {
        is_enabled: true,
        deleted_at: null,
      },
    });
  return settings.map((setting) => ({
    id: setting.id as string & tags.Format<"uuid">,
    config_key: setting.config_key,
    config_value: setting.config_value,
    description: setting.description ?? null,
    category: setting.category ?? null,
    is_enabled: setting.is_enabled,
    created_at: toISOStringSafe(setting.created_at),
    updated_at: toISOStringSafe(setting.updated_at),
  }));
}
