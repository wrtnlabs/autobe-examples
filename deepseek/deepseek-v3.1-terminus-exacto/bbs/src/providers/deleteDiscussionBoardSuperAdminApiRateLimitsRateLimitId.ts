import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperAdminPayload } from "../decorators/payload/SuperAdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteDiscussionBoardSuperAdminApiRateLimitsRateLimitId(props: {
  superAdmin: SuperAdminPayload;
  rateLimitId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify the rate limit configuration exists and is active
  const rateLimit =
    await MyGlobal.prisma.discussion_board_api_rate_limits.findUniqueOrThrow({
      where: {
        id: props.rateLimitId,
        deleted_at: null, // Only consider active records
      },
    });
  // Perform soft deletion with current timestamp
  await MyGlobal.prisma.discussion_board_api_rate_limits.update({
    where: { id: props.rateLimitId },
    data: {
      deleted_at: new Date().toISOString(), // Store as ISO string format
    },
  });
}
