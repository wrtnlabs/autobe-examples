import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformActivityLog";
import { IHrmPlatformActivityLogChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformActivityLogChange";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmPlatformActivityLogChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformActivityLogChange";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformActivityLogChangeAtSummaryTransformer } from "../transformers/HrmPlatformActivityLogChangeAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmPlatformMemberActivityLogsActivityLogIdChanges(props: {
  member: MemberPayload;
  activityLogId: string & tags.Format<"uuid">;
  body: IHrmPlatformActivityLogChange.IRequest;
}): Promise<IPageIHrmPlatformActivityLogChange.ISummary> {
  // Verify the activity log exists and get organization context
  const activityLog =
    await MyGlobal.prisma.hrm_platform_activity_logs.findUniqueOrThrow({
      where: { id: props.activityLogId },
      select: { id: true, hrm_platform_organization_id: true },
    });
  // Get member's organization from their session
  const memberSession =
    await MyGlobal.prisma.hrm_platform_member_sessions.findUniqueOrThrow({
      where: { id: props.member.session_id },
      select: { hrm_platform_organization_id: true },
    });
  // Verify organization match for access control
  if (
    activityLog.hrm_platform_organization_id !==
    memberSession.hrm_platform_organization_id
  ) {
    throw new HttpException("Forbidden", 403);
  }
  // Pagination parameters with defaults
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build WHERE clause with optional filters
  const whereInput: Prisma.hrm_platform_activity_log_changesWhereInput = {
    hrm_platform_activity_log_id: props.activityLogId,
    ...(props.body.field_name !== undefined && {
      field_name: {
        contains: props.body.field_name,
      },
    }),
    ...(props.body.field_type !== undefined && {
      field_type: props.body.field_type,
    }),
    ...(props.body.old_value !== undefined && {
      old_value: {
        contains: props.body.old_value,
      },
    }),
    ...(props.body.new_value !== undefined && {
      new_value: {
        contains: props.body.new_value,
      },
    }),
  } satisfies Prisma.hrm_platform_activity_log_changesWhereInput;
  // Query changes with pagination
  const data = await MyGlobal.prisma.hrm_platform_activity_log_changes.findMany(
    {
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...HrmPlatformActivityLogChangeAtSummaryTransformer.select(),
    },
  );
  // Get total count for pagination
  const total = await MyGlobal.prisma.hrm_platform_activity_log_changes.count({
    where: whereInput,
  });
  // Transform results
  const transformedData = await ArrayUtil.asyncMap(
    data,
    HrmPlatformActivityLogChangeAtSummaryTransformer.transform,
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: transformedData,
  };
}
