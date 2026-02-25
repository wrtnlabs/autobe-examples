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

export async function postDiscussionBoardSuperAdminApiRateLimits(props: {
  superAdmin: SuperAdminPayload;
  body: IDiscussionBoardApiRateLimit.ICreate;
}): Promise<IDiscussionBoardApiRateLimit> {
  // Check uniqueness constraint
  const existing =
    await MyGlobal.prisma.discussion_board_api_rate_limits.findFirst({
      where: {
        endpoint_path: props.body.endpoint_path,
        http_method: props.body.http_method,
        rate_limit_type: props.body.rate_limit_type,
        deleted_at: null,
      },
    });
  if (existing) {
    throw new HttpException(
      "A rate limit configuration with this endpoint, method, and type combination already exists",
      409,
    );
  }
  // Create rate limit configuration
  const created = await MyGlobal.prisma.discussion_board_api_rate_limits.create(
    {
      data: {
        id: v4(),
        endpoint_path: props.body.endpoint_path,
        http_method: props.body.http_method,
        rate_limit_type: props.body.rate_limit_type,
        requests_per_interval: props.body.requests_per_interval,
        interval_seconds: props.body.interval_seconds,
        burst_limit: props.body.burst_limit ?? null,
        enforcement_action: props.body.enforcement_action,
        enforcement_count: 0,
        enforced_at: null,
        is_active: props.body.is_active,
        description: props.body.description ?? null,
        superAdmin: { connect: { id: props.superAdmin.id } },
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      },
      ...DiscussionBoardApiRateLimitTransformer.select(),
    },
  );
  return await DiscussionBoardApiRateLimitTransformer.transform(created);
}
