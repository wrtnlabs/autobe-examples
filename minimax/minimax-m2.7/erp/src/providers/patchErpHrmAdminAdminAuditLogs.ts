import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import { IErpHrmAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdminAuditLog";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIErpHrmAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmAdminAuditLog";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ErpHrmAdminAuditLogAtSummaryTransformer } from "../transformers/ErpHrmAdminAuditLogAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchErpHrmAdminAdminAuditLogs(props: {
  admin: AdminPayload;
  body: IErpHrmAdminAuditLog.IRequest;
}): Promise<IPageIErpHrmAdminAuditLog.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build date range filter
  const createdAtFilter: {
    gte?: Date;
    lte?: Date;
  } = {};
  if (props.body.created_at_from !== undefined) {
    createdAtFilter.gte = new Date(props.body.created_at_from);
  }
  if (props.body.created_at_to !== undefined) {
    createdAtFilter.lte = new Date(props.body.created_at_to);
  }
  // Build where clause from filters
  const whereInput = {
    ...(props.body.action_types &&
      props.body.action_types.length > 0 && {
        action_type: { in: props.body.action_types },
      }),
    ...(props.body.target_entities &&
      props.body.target_entities.length > 0 && {
        target_entity: { in: props.body.target_entities },
      }),
    ...(props.body.target_id !== undefined && {
      target_id: props.body.target_id,
    }),
    ...(props.body.admin_id !== undefined && {
      erp_hrm_admin_id: props.body.admin_id,
    }),
    ...(props.body.ip_address !== undefined && {
      ip_address: props.body.ip_address,
    }),
    ...(Object.keys(createdAtFilter).length > 0 && {
      created_at: createdAtFilter,
    }),
  } satisfies Prisma.erp_hrm_admin_audit_logsWhereInput;
  // Sort configuration
  const sortField = props.body.sort ?? "created_at";
  const sortOrder = props.body.order ?? "desc";
  const orderByInput = {
    [sortField]: sortOrder,
  } satisfies Prisma.erp_hrm_admin_audit_logsOrderByWithRelationInput;
  // Query database with transformer select
  const data = await MyGlobal.prisma.erp_hrm_admin_audit_logs.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...ErpHrmAdminAuditLogAtSummaryTransformer.select(),
  });
  // Get total count
  const total = await MyGlobal.prisma.erp_hrm_admin_audit_logs.count({
    where: whereInput,
  });
  // Transform results using transformer
  const transformedData = await ArrayUtil.asyncMap(
    data,
    ErpHrmAdminAuditLogAtSummaryTransformer.transform,
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
