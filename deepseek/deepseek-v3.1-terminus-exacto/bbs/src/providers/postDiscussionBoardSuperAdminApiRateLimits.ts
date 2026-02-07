import { IDiscussionBoardApiRateLimit } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardApiRateLimit";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardApiRateLimit } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardApiRateLimit";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { DiscussionBoardApiRateLimitCollector } from "../collectors/DiscussionBoardApiRateLimitCollector";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardSuperAdminApiRateLimits(props: {
  superAdmin: SuperadminPayload;
  body: IDiscussionBoardApiRateLimit.ICreate;
}): Promise<IPageIDiscussionBoardApiRateLimit.ISummary> {
  const created = await MyGlobal.prisma.discussion_board_api_rate_limits.create(
    {
      data: await DiscussionBoardApiRateLimitCollector.collect({
        body: props.body,
      }),
    },
  );
  // Transform database record to API response format
  const summary: IDiscussionBoardApiRateLimit.ISummary = {
    id: created.id as string & tags.Format<"uuid">,
    endpoint_path: created.endpoint_path,
    http_method: created.http_method,
    rate_limit_type: created.rate_limit_type,
    requests_per_interval: created.requests_per_interval,
    interval_seconds: created.interval_seconds,
    burst_limit: created.burst_limit ?? null,
    enforcement_action: created.enforcement_action,
    is_active: created.is_active,
    enforcement_count: created.enforcement_count,
    enforced_at: created.enforced_at
      ? toISOStringSafe(created.enforced_at)
      : null,
  };
  return {
    pagination: {
      current: 1,
      limit: 1,
      records: 1,
      pages: 1,
    } satisfies IPage.IPagination,
    data: [summary],
  };
}
