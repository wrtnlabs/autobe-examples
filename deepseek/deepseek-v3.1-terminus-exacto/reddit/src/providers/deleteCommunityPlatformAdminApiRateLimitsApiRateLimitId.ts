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

export async function deleteCommunityPlatformAdminApiRateLimitsApiRateLimitId(props: {
  admin: AdminPayload;
  apiRateLimitId: string & tags.Format<"uuid">;
}): Promise<void> {
  const existingRecord =
    await MyGlobal.prisma.community_platform_api_rate_limits.findUnique({
      where: { id: props.apiRateLimitId },
    });
  if (!existingRecord) {
    throw new HttpException("API rate limit configuration not found", 404);
  }
  await MyGlobal.prisma.community_platform_api_rate_limits.delete({
    where: { id: props.apiRateLimitId },
  });
}
