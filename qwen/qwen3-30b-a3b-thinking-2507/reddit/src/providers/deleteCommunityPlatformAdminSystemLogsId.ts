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

export async function deleteCommunityPlatformAdminSystemLogsId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  const log = await MyGlobal.prisma.community_platform_system_logs.findUnique({
    where: { id: props.id, deleted_at: null },
  });
  if (!log) {
    throw new HttpException("Log not found", 404);
  }
  await MyGlobal.prisma.community_platform_system_logs.update({
    where: { id: props.id },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });
}
