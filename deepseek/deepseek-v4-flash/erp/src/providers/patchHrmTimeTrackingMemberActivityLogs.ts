import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingActivityLog";
import { IHrmTimeTrackingActivityLogType } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingActivityLogType";
import { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmTimeTrackingActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingActivityLog";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTimeTrackingActivityLogAtSummaryTransformer } from "../transformers/HrmTimeTrackingActivityLogAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmTimeTrackingMemberActivityLogs(props: {
  member: MemberPayload;
  body: IHrmTimeTrackingActivityLog.IRequest;
}): Promise<IPageIHrmTimeTrackingActivityLog.ISummary> {
  // Resolve the member's active employee record to determine organization context
  const employee = await MyGlobal.prisma.hrm_time_tracking_employees.findFirst({
    where: {
      hrm_time_tracking_member_id: props.member.id,
      status: "active",
      deleted_at: null,
    },
    select: {
      hrm_time_tracking_organization_id: true,
      hrm_time_tracking_role_id: true,
    },
  });
  if (employee === null) {
    throw new HttpException("No active organization membership", 403);
  }
  // Check that the member has org:manage permission
  const permission =
    await MyGlobal.prisma.hrm_time_tracking_role_permissions.findFirst({
      where: {
        hrm_time_tracking_role_id: employee.hrm_time_tracking_role_id,
        permission_code: "org:manage",
        deleted_at: null,
      },
    });
  if (permission === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Build WHERE clause from optional filters
  const whereInput = {
    hrm_time_tracking_organization_id:
      employee.hrm_time_tracking_organization_id,
    ...(props.body.search !== undefined && {
      OR: [
        {
          target_entity_name: {
            contains: props.body.search,
            mode: "insensitive" as const,
          },
        },
        {
          details: {
            contains: props.body.search,
            mode: "insensitive" as const,
          },
        },
      ],
    }),
    ...(props.body.activity_log_type_code !== undefined && {
      activityLogType: {
        code: props.body.activity_log_type_code,
      },
    }),
    ...(props.body.member_id !== undefined && {
      hrm_time_tracking_member_id: props.body.member_id,
    }),
    ...((props.body.from_date !== undefined ||
      props.body.to_date !== undefined) && {
      created_at: {
        ...(props.body.from_date !== undefined && {
          gte: props.body.from_date,
        }),
        ...(props.body.to_date !== undefined && {
          lt: props.body.to_date,
        }),
      },
    }),
  } satisfies Prisma.hrm_time_tracking_activity_logsWhereInput;
  // Pagination defaults
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Execute findMany query with transformer select
  const records =
    await MyGlobal.prisma.hrm_time_tracking_activity_logs.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...HrmTimeTrackingActivityLogAtSummaryTransformer.select(),
    });
  // Execute count query
  const total = await MyGlobal.prisma.hrm_time_tracking_activity_logs.count({
    where: whereInput,
  });
  // Transform records and return paginated response
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      HrmTimeTrackingActivityLogAtSummaryTransformer.transform,
    ),
  } satisfies IPageIHrmTimeTrackingActivityLog.ISummary;
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
// Complete the code below, disregard the import part and return only the function part.
// 
// ```typescript
// import { ArrayUtil } from "@nestia/e2e";
// import { HttpException } from "@nestjs/common";
// import { Prisma } from "@prisma/sdk";
// import jwt from "jsonwebtoken";
// import typia, { tags } from "typia";
// import { v4 } from "uuid";
// import { MyGlobal } from "../MyGlobal";
// import { PasswordUtil } from "../utils/PasswordUtil";
// import { toISOStringSafe } from "../utils/toISOStringSafe"
// 
// import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
// import { IHrmTimeTrackingActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingActivityLog";
// import { IPageIHrmTimeTrackingActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingActivityLog";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
// import { IHrmTimeTrackingActivityLogType } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingActivityLogType";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchHrmTimeTrackingMemberActivityLogs(props: {
//   member: MemberPayload;
//   body: IHrmTimeTrackingActivityLog.IRequest;
// }): Promise<IPageIHrmTimeTrackingActivityLog.ISummary> {
//   const records = await MyGlobal.prisma.hrm_time_tracking_activity_logs.findMany({
//     ...HrmTimeTrackingActivityLogAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, HrmTimeTrackingActivityLogAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------