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

export async function deleteDiscussionBoardAdminSystemConfigurationsConfigurationId(props: {
  admin: AdminPayload;
  configurationId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify configuration exists and is not already deleted using conditional update
  const now = new Date().toISOString();
  const result =
    await MyGlobal.prisma.discussion_board_system_configurations.updateMany({
      where: {
        id: props.configurationId,
        deleted_at: null,
      },
      data: {
        deleted_at: now,
        updated_at: now,
      },
    });
  if (result.count === 0) {
    // Check if configuration exists or already deleted
    const existing =
      await MyGlobal.prisma.discussion_board_system_configurations.findUnique({
        where: { id: props.configurationId },
      });
    if (existing === null) {
      throw new HttpException("Configuration not found", 404);
    } else {
      throw new HttpException("Configuration already deleted", 400);
    }
  }
}
