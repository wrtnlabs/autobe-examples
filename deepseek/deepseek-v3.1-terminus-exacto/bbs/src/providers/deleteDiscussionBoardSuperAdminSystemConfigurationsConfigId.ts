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

export async function deleteDiscussionBoardSuperAdminSystemConfigurationsConfigId(props: {
  superAdmin: SuperadminPayload;
  configId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Check if configuration exists and is not already deleted
  const config =
    await MyGlobal.prisma.discussion_board_system_configurations.findUnique({
      where: { id: props.configId },
    });
  if (!config) {
    throw new HttpException("Configuration not found", 404);
  }
  if (config.deleted_at !== null) {
    throw new HttpException("Configuration already deleted", 400);
  }
  // Perform hard deletion
  await MyGlobal.prisma.discussion_board_system_configurations.delete({
    where: { id: props.configId },
  });
}
