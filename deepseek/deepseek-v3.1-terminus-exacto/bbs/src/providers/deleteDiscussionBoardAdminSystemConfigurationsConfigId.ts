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

export async function deleteDiscussionBoardAdminSystemConfigurationsConfigId(props: {
  admin: AdminPayload;
  configId: string & tags.Format<"uuid">;
}): Promise<void> {
  // First, verify the configuration exists and is not already deleted
  const configuration =
    await MyGlobal.prisma.discussion_board_system_configurations.findUniqueOrThrow(
      {
        where: { id: props.configId },
      },
    );
  // Check if already deleted
  if (configuration.deleted_at !== null) {
    throw new HttpException("Configuration has already been deleted", 400);
  }
  // Perform soft deletion by setting deleted_at timestamp
  const now = new Date().toISOString();
  await MyGlobal.prisma.discussion_board_system_configurations.update({
    where: { id: props.configId },
    data: {
      deleted_at: now,
      updated_at: now,
    },
  });
}
