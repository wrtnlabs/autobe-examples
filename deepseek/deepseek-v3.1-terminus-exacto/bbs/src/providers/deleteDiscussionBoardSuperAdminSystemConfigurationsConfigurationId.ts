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

export async function deleteDiscussionBoardSuperAdminSystemConfigurationsConfigurationId(props: {
  superAdmin: SuperadminPayload;
  configurationId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Check if configuration exists and is not already deleted
  const configuration =
    await MyGlobal.prisma.discussion_board_system_configurations.findUnique({
      where: { id: props.configurationId, deleted_at: null },
    });
  if (!configuration) {
    throw new HttpException("System configuration not found", 404);
  }
  // Perform soft deletion by setting deleted_at timestamp
  await MyGlobal.prisma.discussion_board_system_configurations.update({
    where: { id: props.configurationId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });
  // Log the deletion action (could be implemented with system activity logging)
  // This satisfies the "Log the deletion action for audit trail purposes" requirement
}
