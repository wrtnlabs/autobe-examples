import { ICommunityPlatformSystemLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSystemLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformSystemLogCollector } from "../collectors/CommunityPlatformSystemLogCollector";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformSystemLogTransformer } from "../transformers/CommunityPlatformSystemLogTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformAdminSystemLogs(props: {
  admin: AdminPayload;
  body: ICommunityPlatformSystemLog.ICreate;
}): Promise<ICommunityPlatformSystemLog> {
  const created = await MyGlobal.prisma.community_platform_system_logs.create({
    data: await CommunityPlatformSystemLogCollector.collect({
      body: props.body,
    }),
  });
  return await CommunityPlatformSystemLogTransformer.transform(created);
}
