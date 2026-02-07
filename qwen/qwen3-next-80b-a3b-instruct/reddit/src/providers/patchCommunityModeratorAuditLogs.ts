import { ICommunityAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAuditLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityAuditLog";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { CommunityAuditLogAtSummaryTransformer } from "../transformers/CommunityAuditLogAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityModeratorAuditLogs(props: {
  moderator: ModeratorPayload;
  body: ICommunityAuditLog.IRequest;
}): Promise<IPageICommunityAuditLog.ISummary> {
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  const whereInput = {
    moderator_id: props.moderator.id,
  } satisfies Prisma.community_audit_logsWhereInput;
  const data = await MyGlobal.prisma.community_audit_logs.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...CommunityAuditLogAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.community_audit_logs.count({
    where: whereInput,
  });
  const transformedData = await Promise.all(
    data.map(CommunityAuditLogAtSummaryTransformer.transform),
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
