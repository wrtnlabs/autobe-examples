import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmActivityLog";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIErpHrmActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmActivityLog";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmActivityLogAtSummaryTransformer } from "../transformers/ErpHrmActivityLogAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchErpHrmMemberActivityLogs(props: {
  member: MemberPayload;
  body: IErpHrmActivityLog.IRequest;
}): Promise<IPageIErpHrmActivityLog.ISummary> {
  // Get organization context from session
  const session =
    await MyGlobal.prisma.erp_hrm_member_sessions.findUniqueOrThrow({
      where: { id: props.member.session_id },
      select: { erp_hrm_organization_id: true },
    });
  if (session.erp_hrm_organization_id === null) {
    throw new HttpException("No organization context selected", 400);
  }
  // Pagination defaults
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build date range filter
  const createdAtFilter: {
    gte?: Date;
    lte?: Date;
  } = {};
  if (props.body.from !== undefined) {
    createdAtFilter.gte = new Date(props.body.from);
  }
  if (props.body.to !== undefined) {
    createdAtFilter.lte = new Date(props.body.to);
  }
  // Build WHERE clause
  const whereInput = {
    organization_id: session.erp_hrm_organization_id,
    ...(props.body.action_type !== undefined && {
      action_type: props.body.action_type,
    }),
    ...(props.body.member_id !== undefined && {
      member_id: props.body.member_id,
    }),
    ...(Object.keys(createdAtFilter).length > 0 && {
      created_at: createdAtFilter,
    }),
  } satisfies Prisma.erp_hrm_activity_logsWhereInput;
  // Query with pagination
  const data = await MyGlobal.prisma.erp_hrm_activity_logs.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" as const },
    ...ErpHrmActivityLogAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.erp_hrm_activity_logs.count({
    where: whereInput,
  });
  // Transform results
  const transformedData = await ArrayUtil.asyncMap(
    data,
    ErpHrmActivityLogAtSummaryTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIErpHrmActivityLog.ISummary;
}
