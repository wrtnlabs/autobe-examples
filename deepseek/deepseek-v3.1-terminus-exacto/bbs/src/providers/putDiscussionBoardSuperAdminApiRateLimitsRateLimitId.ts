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

export async function putDiscussionBoardSuperAdminApiRateLimitsRateLimitId(props: {
  superAdmin: SuperAdminPayload;
  rateLimitId: string & tags.Format<"uuid">;
  body: IDiscussionBoardApiRateLimit.IUpdate;
}): Promise<IDiscussionBoardApiRateLimit> {
  // Verify the rate limit configuration exists and is not deleted
  await MyGlobal.prisma.discussion_board_api_rate_limits.findUniqueOrThrow({
    where: {
      id: props.rateLimitId,
      deleted_at: null,
    },
  });
  // Prepare update data with conditional field updates and proper null handling
  const updateData: Prisma.discussion_board_api_rate_limitsUpdateInput = {
    updated_at: new Date(),
  };
  if (props.body.endpoint_path !== undefined) {
    updateData.endpoint_path = props.body.endpoint_path;
  }
  if (props.body.http_method !== undefined) {
    updateData.http_method = props.body.http_method;
  }
  if (props.body.rate_limit_type !== undefined) {
    updateData.rate_limit_type = props.body.rate_limit_type;
  }
  if (props.body.requests_per_interval !== undefined) {
    updateData.requests_per_interval = props.body.requests_per_interval;
  }
  if (props.body.interval_seconds !== undefined) {
    updateData.interval_seconds = props.body.interval_seconds;
  }
  if (props.body.burst_limit !== undefined) {
    updateData.burst_limit =
      props.body.burst_limit === null ? null : props.body.burst_limit;
  }
  if (props.body.enforcement_action !== undefined) {
    updateData.enforcement_action = props.body.enforcement_action;
  }
  if (props.body.is_active !== undefined) {
    updateData.is_active = props.body.is_active;
  }
  if (props.body.description !== undefined) {
    updateData.description =
      props.body.description === null ? null : props.body.description;
  }
  // Reset enforcement counters/timestamps if rate parameters change
  const rateParamsChanged =
    props.body.requests_per_interval !== undefined ||
    props.body.interval_seconds !== undefined ||
    props.body.enforcement_action !== undefined;
  if (rateParamsChanged) {
    updateData.enforced_at = null;
    updateData.enforcement_count = 0;
  }
  // Perform the update and return the complete updated record
  const updatedRateLimit =
    await MyGlobal.prisma.discussion_board_api_rate_limits.update({
      where: { id: props.rateLimitId },
      data: updateData,
      ...DiscussionBoardApiRateLimitTransformer.select(),
    });
  return await DiscussionBoardApiRateLimitTransformer.transform(
    updatedRateLimit,
  );
}
