import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteDiscussionBoardSuperAdminApiRateLimitsRateLimitId(props: {
  superAdmin: SuperadminPayload;
  rateLimitId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Check if the rate limit exists and is not already deleted
  const existingRateLimit =
    await MyGlobal.prisma.discussion_board_api_rate_limits.findUnique({
      where: { id: props.rateLimitId },
    });
  if (!existingRateLimit) {
    throw new HttpException("API rate limit configuration not found", 404);
  }
  if (existingRateLimit.deleted_at !== null) {
    throw new HttpException(
      "API rate limit configuration already deleted",
      400,
    );
  }
  // Perform soft deletion by setting deleted_at timestamp
  await MyGlobal.prisma.discussion_board_api_rate_limits.update({
    where: { id: props.rateLimitId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
    },
  });
}
