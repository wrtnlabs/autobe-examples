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

export async function deleteCommunityAdminSystemConfigsConfigId(props: {
  admin: AdminPayload;
  configId: string & tags.Format<"uuid">;
}): Promise<void> {
  const result = await MyGlobal.prisma.community_system_configs.delete({
    where: { id: props.configId },
  });
  if (!result) {
    throw new HttpException("Configuration not found", 404);
  }
}
