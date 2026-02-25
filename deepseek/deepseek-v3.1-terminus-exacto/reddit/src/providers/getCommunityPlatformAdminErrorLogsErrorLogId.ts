import { ICommunityPlatformErrorLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformErrorLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformErrorLogTransformer } from "../transformers/CommunityPlatformErrorLogTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformAdminErrorLogsErrorLogId(props: {
  admin: AdminPayload;
  errorLogId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformErrorLog> {
  const errorLog =
    await MyGlobal.prisma.community_platform_error_logs.findUniqueOrThrow({
      where: { id: props.errorLogId },
      ...CommunityPlatformErrorLogTransformer.select(),
    });
  return await CommunityPlatformErrorLogTransformer.transform(errorLog);
}
