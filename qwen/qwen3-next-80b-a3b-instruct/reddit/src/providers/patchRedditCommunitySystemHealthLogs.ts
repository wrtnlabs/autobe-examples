import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCommunitySystemHealthLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunitySystemHealthLog";
import { IRedditCommunitySystemHealthLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySystemHealthLog";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCommunitySystemHealthLogTransformer } from "../transformers/RedditCommunitySystemHealthLogTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCommunitySystemHealthLogs(props: {
  body: IRedditCommunitySystemHealthLog.IRequest;
}): Promise<IPageIRedditCommunitySystemHealthLog> {
  const page = 1; // Default page
  const limit = 20; // Default limit as per specification
  const skip = (page - 1) * limit;
  // Build where clause dynamically from request filters
  const where: Prisma.reddit_community_system_health_logsWhereInput = {
    deleted_at: null,
  };
  if (props.body.status && props.body.status.length > 0) {
    where.status = { in: props.body.status };
  }
  if (props.body.component && props.body.component.length > 0) {
    where.component = { in: props.body.component };
  }
  if (props.body.startDate || props.body.endDate) {
    const createdAtFilter: Prisma.DateTimeFilter = {};
    if (props.body.startDate) {
      createdAtFilter.gte = toISOStringSafe(props.body.startDate);
    }
    if (props.body.endDate) {
      createdAtFilter.lte = toISOStringSafe(props.body.endDate);
    }
    where.created_at = createdAtFilter;
  }
  // Fetch paginated data
  const data =
    await MyGlobal.prisma.reddit_community_system_health_logs.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
      ...RedditCommunitySystemHealthLogTransformer.select(),
    });
  // Fetch total count for pagination
  const total = await MyGlobal.prisma.reddit_community_system_health_logs.count(
    {
      where,
    },
  );
  // Transform data using the available transformer
  const transformedData = await ArrayUtil.asyncMap(
    data,
    RedditCommunitySystemHealthLogTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
