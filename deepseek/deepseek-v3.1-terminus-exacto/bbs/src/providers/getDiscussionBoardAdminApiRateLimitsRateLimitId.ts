import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardApiRateLimit } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardApiRateLimit";
import { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardApiRateLimitTransformer } from "../transformers/DiscussionBoardApiRateLimitTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardAdminApiRateLimitsRateLimitId(props: {
  admin: AdminPayload;
  rateLimitId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardApiRateLimit> {
  const rateLimit =
    await MyGlobal.prisma.discussion_board_api_rate_limits.findUnique({
      where: {
        id: props.rateLimitId,
        deleted_at: null, // Only retrieve non-deleted records
      },
      ...DiscussionBoardApiRateLimitTransformer.select(),
    });
  if (!rateLimit) {
    throw new HttpException("API rate limit not found", 404);
  }
  return await DiscussionBoardApiRateLimitTransformer.transform(rateLimit);
}
