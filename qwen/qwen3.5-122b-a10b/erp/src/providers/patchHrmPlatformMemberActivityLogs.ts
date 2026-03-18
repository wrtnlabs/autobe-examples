import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformActivityLog";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmPlatformActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformActivityLog";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformActivityLogAtSummaryTransformer } from "../transformers/HrmPlatformActivityLogAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmPlatformMemberActivityLogs(props: {
  member: MemberPayload;
  body: IHrmPlatformActivityLog.IRequest;
}): Promise<IPageIHrmPlatformActivityLog.ISummary> {
  // Get member's current organization from their employee record
  const employee = await MyGlobal.prisma.hrm_platform_employees.findFirst({
    where: {
      hrm_platform_user_id: props.member.id,
      deleted_at: null,
    },
    select: {
      hrm_platform_organization_id: true,
      hrm_platform_role_id: true,
    },
  });
  if (!employee) {
    throw new HttpException("Member not enrolled in any organization", 403);
  }
  const organizationId = employee.hrm_platform_organization_id;
  const roleId = employee.hrm_platform_role_id;
  // Validate org:manage permission
  if (roleId) {
    const role = await MyGlobal.prisma.hrm_platform_roles.findUnique({
      where: { id: roleId },
      select: {
        permissions: {
          where: {
            permission: {
              code: "org:manage",
            },
          },
          select: { id: true },
        },
      },
    });
    if (!role || role.permissions.length === 0) {
      throw new HttpException("Forbidden", 403);
    }
  } else {
    throw new HttpException("Forbidden", 403);
  }
  // Build where clause with filters
  const whereInput: Prisma.hrm_platform_activity_logsWhereInput = {
    organization_id: organizationId,
    ...(props.body.action_type && {
      action_type: props.body.action_type,
    }),
    ...(props.body.user_id && {
      user_id: props.body.user_id,
    }),
    ...(props.body.target_entity && {
      target_entity: props.body.target_entity,
    }),
    ...(props.body.target_id && {
      target_id: props.body.target_id,
    }),
    ...(props.body.created_at_from && {
      created_at: {
        gte: new Date(props.body.created_at_from),
      },
    }),
    ...(props.body.created_at_to && {
      created_at: {
        lte: new Date(props.body.created_at_to),
      },
    }),
  } satisfies Prisma.hrm_platform_activity_logsWhereInput;
  // Pagination parameters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Fetch paginated activity logs
  const data = await MyGlobal.prisma.hrm_platform_activity_logs.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...HrmPlatformActivityLogAtSummaryTransformer.select(),
  } satisfies Prisma.hrm_platform_activity_logsFindManyArgs);
  // Get total count
  const total = await MyGlobal.prisma.hrm_platform_activity_logs.count({
    where: whereInput,
  });
  // Transform to DTO
  const transformedData = await ArrayUtil.asyncMap(
    data,
    HrmPlatformActivityLogAtSummaryTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIHrmPlatformActivityLog.ISummary;
}
