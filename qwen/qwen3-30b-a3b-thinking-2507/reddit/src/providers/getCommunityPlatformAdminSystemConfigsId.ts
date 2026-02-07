import { ICommunityPlatformSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSystemConfig";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformSystemConfigAtSummaryTransformer } from "../transformers/CommunityPlatformSystemConfigAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformAdminSystemConfigsId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformSystemConfig.ISummary> {
  const systemConfig =
    await MyGlobal.prisma.community_platform_system_configs.findUnique({
      where: {
        id: props.id,
        deleted_at: null,
      },
      ...CommunityPlatformSystemConfigAtSummaryTransformer.select(),
    });
  if (!systemConfig) {
    throw new HttpException("System config not found", 404);
  }
  return await CommunityPlatformSystemConfigAtSummaryTransformer.transform(
    systemConfig,
  );
}
