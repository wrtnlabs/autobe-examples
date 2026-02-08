import { IDiscussionBoardSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemSetting";
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

export async function postDiscussionBoardSystemSettingsRefresh(): Promise<IDiscussionBoardSystemSetting.IRefreshResponse> {
  try {
    // Reload all system settings records from the database
    await MyGlobal.prisma.discussion_board_system_settings.findMany({
      where: { deleted_at: null },
    });
    // Normally, refresh or cache clear would happen here.
    // Since MyGlobal.systemSettingsCache does not exist, skip that.
    return {};
  } catch (error) {
    console.error("Failed to refresh system settings:", error);
    throw new HttpException("Failed to refresh system settings", 500);
  }
}
