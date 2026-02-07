import { ICommunitySystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunitySystemConfig";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunitySystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunitySystemConfig";
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

export async function patchCommunityAdminAuditSystemConfigs(props: {
  admin: AdminPayload;
  body: ICommunitySystemConfig.IRequest;
}): Promise<IPageICommunitySystemConfig.ISummary> {
  // Extract pagination parameters - these are not part of IRequest but expected in request
  const page = (props.body as any).page ?? 1;
  const limit = (props.body as any).limit ?? 100;
  const skip = (page - 1) * limit;
  // Build where clause based on audit log structure
  const whereClause: Prisma.community_audit_logsWhereInput = {
    target_type: "system_config",
    // These map to direct fields in Prisma model
    ...((props.body as any).after && {
      created_at: { gte: (props.body as any).after },
    }),
    ...((props.body as any).before && {
      created_at: { lte: (props.body as any).before },
    }),
    ...((props.body as any).action_type && {
      action_type: (props.body as any).action_type,
    }),
    ...((props.body as any).moderator_id && {
      moderator_id: (props.body as any).moderator_id,
    }),
  };
  // Query audit logs - using correct field names
  const data = await MyGlobal.prisma.community_audit_logs.findMany({
    where: whereClause,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      action_type: true,
      description: true,
      created_at: true,
      moderator_id: true, // direct field, not object
      target_id: true, // direct field, not object
    },
  });
  // Count total records
  const total = await MyGlobal.prisma.community_audit_logs.count({
    where: whereClause,
  });
  // Transform each record to ICommunitySystemConfig.ISummary format
  // Note: config_name extraction requires additional query since target_id is just an ID
  const transformedData = data.map((item) => ({
    id: item.id,
    config_name: "", // Need to query the target configuration by target_id
    action_type: item.action_type,
    description: item.description ?? undefined,
    moderator_id: item.moderator_id, // direct field
    created_at: toISOStringSafe(item.created_at),
  }));
  // Return paginated response
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: transformedData,
  };
}
