import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperAdminPayload } from "../decorators/payload/SuperAdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteDiscussionBoardSuperAdminSystemConfigurationsConfigurationId(props: {
  superAdmin: SuperAdminPayload;
  configurationId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Use updateMany with conditions to ensure atomic operation
  const result =
    await MyGlobal.prisma.discussion_board_system_configurations.updateMany({
      where: {
        id: props.configurationId,
        deleted_at: null,
      },
      data: {
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    });
  // Check if any records were actually updated
  if (result.count === 0) {
    throw new HttpException("Configuration not found or already deleted", 404);
  }
}
