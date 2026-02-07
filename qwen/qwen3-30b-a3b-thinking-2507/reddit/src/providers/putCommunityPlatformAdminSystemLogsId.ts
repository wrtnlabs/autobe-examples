import { ICommunityPlatformSystemLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSystemLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformSystemLogTransformer } from "../transformers/CommunityPlatformSystemLogTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putCommunityPlatformAdminSystemLogsId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
  body: ICommunityPlatformSystemLog.IUpdate;
}): Promise<ICommunityPlatformSystemLog> {
  const log = await MyGlobal.prisma.community_platform_system_logs.findUnique({
    where: { id: props.id },
  });
  if (!log) {
    throw new HttpException("System log not found", 404);
  }
  const updatedLog =
    await MyGlobal.prisma.community_platform_system_logs.update({
      where: { id: props.id },
      data: {
        level: props.body.level,
        message: props.body.message,
        context: props.body.context,
        data: props.body.data,
      },
    });
  return await CommunityPlatformSystemLogTransformer.transform(updatedLog);
}
