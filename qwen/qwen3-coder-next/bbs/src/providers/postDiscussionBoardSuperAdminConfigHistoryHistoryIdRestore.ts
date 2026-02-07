import { IDiscussionBoardSystemConfigHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemConfigHistory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardSuperAdminConfigHistoryHistoryIdRestore(props: {
  superAdmin: SuperadminPayload;
  historyId: string;
}): Promise<IDiscussionBoardSystemConfigHistory.IRestoreResponse> {
  // Find the historical configuration record
  const history =
    await MyGlobal.prisma.discussion_board_system_config_histories.findUnique({
      where: {
        id: props.historyId,
      },
    });
  if (!history) {
    throw new HttpException("Configuration history not found", 404);
  }
  // Parse the configuration data (stored as JSON string)
  const configData = JSON.parse(history.config_data) as {
    [key: string]: any;
  };
  // Wrap operations in transaction for data consistency
  await MyGlobal.prisma.$transaction(async (prisma) => {
    // Update current system settings with historical configuration
    for (const [key, value] of Object.entries(configData)) {
      // Find or create setting for this key
      const setting = await prisma.discussion_board_system_settings.findFirst({
        where: {
          config_key: key,
          deleted_at: null,
        },
      });
      if (setting) {
        // Update existing setting
        await prisma.discussion_board_system_settings.update({
          where: {
            id: setting.id,
          },
          data: {
            config_value: JSON.stringify(value),
            updated_at: toISOStringSafe(new Date()),
          },
        });
      } else {
        // Create new setting
        await prisma.discussion_board_system_settings.create({
          data: {
            id: v4(),
            config_key: key,
            config_value: JSON.stringify(value),
            is_enabled: true,
            created_at: toISOStringSafe(new Date()),
            updated_at: toISOStringSafe(new Date()),
          },
        });
      }
    }
    // Create audit log entry for the restoration
    await prisma.discussion_board_system_logs.create({
      data: {
        id: v4(),
        event_type: "CONFIG_RESTORE",
        severity: "high",
        description: `Configuration restored from history ID: ${props.historyId}`,
        created_at: toISOStringSafe(new Date()),
        updated_at: toISOStringSafe(new Date()),
      },
    });
  });
  // Return empty response as per IRestoreResponse type
  return {};
}
