import { ICommunityPlatformActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformActivityLog";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformActivityLogCollector } from "../collectors/CommunityPlatformActivityLogCollector";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformActivityLogTransformer } from "../transformers/CommunityPlatformActivityLogTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformAdminActivityLogs(props: {
  admin: AdminPayload;
  body: ICommunityPlatformActivityLog.ICreate;
}): Promise<ICommunityPlatformActivityLog> {
  const data = await CommunityPlatformActivityLogCollector.collect({
    body: props.body,
  });
  const created = await MyGlobal.prisma.community_platform_activity_logs.create(
    {
      data,
    },
  );
  const fetched =
    await MyGlobal.prisma.community_platform_activity_logs.findUniqueOrThrow({
      where: { id: created.id },
      ...CommunityPlatformActivityLogTransformer.select(),
    });
  return await CommunityPlatformActivityLogTransformer.transform(fetched);
}
