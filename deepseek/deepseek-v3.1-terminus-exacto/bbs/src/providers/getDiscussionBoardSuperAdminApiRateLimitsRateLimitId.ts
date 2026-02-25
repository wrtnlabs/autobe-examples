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
import { SuperAdminPayload } from "../decorators/payload/SuperAdminPayload";
import { DiscussionBoardApiRateLimitTransformer } from "../transformers/DiscussionBoardApiRateLimitTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardSuperAdminApiRateLimitsRateLimitId(props: {
  superAdmin: SuperAdminPayload;
  rateLimitId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardApiRateLimit> {
  const rateLimit =
    await MyGlobal.prisma.discussion_board_api_rate_limits.findUniqueOrThrow({
      where: {
        id: props.rateLimitId,
        deleted_at: null,
      },
      ...DiscussionBoardApiRateLimitTransformer.select(),
    });
  return await DiscussionBoardApiRateLimitTransformer.transform(rateLimit);
}
