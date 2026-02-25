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
import { DiscussionBoardApiRateLimitCollector } from "../collectors/DiscussionBoardApiRateLimitCollector";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardApiRateLimitTransformer } from "../transformers/DiscussionBoardApiRateLimitTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardAdminApiRateLimits(props: {
  admin: AdminPayload;
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
      select: { id: true },
    });
  if (existing) {
    throw new HttpException(
      `Rate limit configuration for endpoint '${props.body.endpoint_path}' with method '${props.body.http_method}' and type '${props.body.rate_limit_type}' already exists`,
      409,
    );
  }
  // Use collector to create data
  const data = await DiscussionBoardApiRateLimitCollector.collect({
    body: props.body,
    discussionBoardAdmins: { id: props.admin.id } satisfies IEntity,
    discussionBoardAdminSessions: {
      id: props.admin.session_id,
    } satisfies IEntity,
  });
  // Create record
  const created = await MyGlobal.prisma.discussion_board_api_rate_limits.create(
    {
      data,
      ...DiscussionBoardApiRateLimitTransformer.select(),
    },
  );
  // Transform and return
  return await DiscussionBoardApiRateLimitTransformer.transform(created);
}
