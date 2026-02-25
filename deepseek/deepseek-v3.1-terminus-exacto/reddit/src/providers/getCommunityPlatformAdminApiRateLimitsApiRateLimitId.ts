import { ICommunityPlatformApiRateLimit } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformApiRateLimit";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformApiRateLimitTransformer } from "../transformers/CommunityPlatformApiRateLimitTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformAdminApiRateLimitsApiRateLimitId(props: {
  admin: AdminPayload;
  apiRateLimitId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformApiRateLimit> {
  const rateLimit =
    await MyGlobal.prisma.community_platform_api_rate_limits.findUniqueOrThrow({
      where: { id: props.apiRateLimitId },
      ...CommunityPlatformApiRateLimitTransformer.select(),
    });
  return await CommunityPlatformApiRateLimitTransformer.transform(rateLimit);
}
