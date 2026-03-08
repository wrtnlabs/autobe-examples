import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditPlatformCircuitBreaker } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformCircuitBreaker";
import { IRedditPlatformCircuitBreaker } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCircuitBreaker";
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

export async function getRedditPlatformAdminCircuitBreakers(props: {
  admin: AdminPayload;
}): Promise<IPageIRedditPlatformCircuitBreaker.ISummary> {
  const page = 1;
  const limit = 100;
  const skip = 0;
  const allBreakers: Array<IRedditPlatformCircuitBreaker.ISummary> = [];
  const total = allBreakers.length;
  const data = allBreakers.slice(skip, skip + limit);
  return {
    data,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIRedditPlatformCircuitBreaker.ISummary;
}
