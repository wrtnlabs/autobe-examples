import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemConfig";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postDiscussionBoardAdminSystemConfigs(props: {
  admin: AdminPayload;
  body: IDiscussionBoardSystemConfig.ICreate;
}): Promise<IDiscussionBoardSystemConfig> {
  // Step 1: Prevent duplicate key
  const existing =
    await MyGlobal.prisma.discussion_board_system_configs.findFirst({
      where: {
        config_key: props.body.config_key,
        deleted_at: null,
      },
    });
  if (existing) {
    throw new HttpException("Config key already exists", 409);
  }

  // Step 2: Insert with server-generated UUID and timestamps
  const now = toISOStringSafe(new Date());
  let created;
  try {
    created = await MyGlobal.prisma.discussion_board_system_configs.create({
      data: {
        id: v4(),
        config_key: props.body.config_key,
        config_value: props.body.config_value,
        description: props.body.description ?? null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });
  } catch (err) {
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      err.code === "P2002"
    ) {
      // Unique constraint violation (should never happen due to prior check)
      throw new HttpException("Config key already exists", 409);
    }
    throw err;
  }

  return {
    id: created.id,
    config_key: created.config_key,
    config_value: created.config_value,
    description: created.description ?? undefined,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at != null
        ? toISOStringSafe(created.deleted_at)
        : undefined,
  };
}
