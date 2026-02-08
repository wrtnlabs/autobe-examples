import { ICommunityPlatformActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformActivityLog";
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

export async function deleteCommunityPlatformActivityLogsId(props: {
  id: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformActivityLog> {
  const record =
    await MyGlobal.prisma.community_platform_activity_logs.findUnique({
      where: { id: props.id },
    });
  if (!record) throw new HttpException("Activity log not found", 404);
  const deleted = await MyGlobal.prisma.community_platform_activity_logs.delete(
    {
      where: { id: props.id },
    },
  );
  return deleted;
}
