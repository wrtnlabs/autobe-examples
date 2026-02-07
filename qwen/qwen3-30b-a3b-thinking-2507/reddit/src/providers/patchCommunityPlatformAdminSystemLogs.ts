import { ICommunityPlatformSystemLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSystemLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformSystemLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformSystemLog";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformSystemLogAtSummaryTransformer } from "../transformers/CommunityPlatformSystemLogAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformAdminSystemLogs(props: {
  admin: AdminPayload;
  body: ICommunityPlatformSystemLog.IRequest;
}): Promise<IPageICommunityPlatformSystemLog.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput = {
    deleted_at: null,
    ...(props.body.level && { level: props.body.level }),
    ...(props.body.message && { message: { contains: props.body.message } }),
    ...(props.body.context && { context: { contains: props.body.context } }),
    ...(props.body.data && { data: { contains: props.body.data } }),
    ...(props.body.startDate && { created_at: { gte: props.body.startDate } }),
    ...(props.body.endDate && { created_at: { lte: props.body.endDate } }),
  } satisfies Prisma.community_platform_system_logsWhereInput;
  const data = await MyGlobal.prisma.community_platform_system_logs.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...CommunityPlatformSystemLogAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.community_platform_system_logs.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      CommunityPlatformSystemLogAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
