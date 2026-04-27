import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
import { IHrmTimeTrackingTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimer";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmTimeTrackingTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingTimer";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTimeTrackingTimerAtSummaryTransformer } from "../transformers/HrmTimeTrackingTimerAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmTimeTrackingMemberTimers(props: {
  member: MemberPayload;
  body: IHrmTimeTrackingTimer.IRequest;
}): Promise<IPageIHrmTimeTrackingTimer.ISummary> {
  // 1. Resolve the requesting user's employee record for organization context
  const employee = await MyGlobal.prisma.hrm_time_tracking_employees.findFirst({
    where: {
      hrm_time_tracking_member_id: props.member.id,
      deleted_at: null,
      status: "active",
    },
    select: {
      id: true,
      hrm_time_tracking_organization_id: true,
      hrm_time_tracking_role_id: true,
    },
  });
  const limit: number = props.body.limit ?? 20;
  if (employee === null) {
    return {
      pagination: {
        current: props.body.page ?? 1,
        limit,
        records: 0,
        pages: 0,
      },
      data: [],
    };
  }
  // 2. Check if the user's role has time:view_all permission
  const viewAllPermission =
    await MyGlobal.prisma.hrm_time_tracking_role_permissions.findFirst({
      where: {
        hrm_time_tracking_role_id: employee.hrm_time_tracking_role_id,
        permission_code: "time:view_all",
        deleted_at: null,
      },
      select: { id: true },
    });
  const hasViewAll: boolean = viewAllPermission !== null;
  // 3. Determine which employee IDs the user can access
  let employeeIds: string[] = [];
  if (hasViewAll) {
    if (props.body.employeeId !== undefined) {
      const target =
        await MyGlobal.prisma.hrm_time_tracking_employees.findFirst({
          where: {
            id: props.body.employeeId,
            hrm_time_tracking_organization_id:
              employee.hrm_time_tracking_organization_id,
            deleted_at: null,
          },
          select: { id: true },
        });
      if (target !== null) {
        employeeIds = [target.id];
      }
    } else {
      const orgEmployees =
        await MyGlobal.prisma.hrm_time_tracking_employees.findMany({
          where: {
            hrm_time_tracking_organization_id:
              employee.hrm_time_tracking_organization_id,
            deleted_at: null,
          },
          select: { id: true },
        });
      employeeIds = orgEmployees.map((e) => e.id);
    }
  } else {
    // No time:view_all permission — only the requesting user's own timer records
    employeeIds = [employee.id];
  }
  if (employeeIds.length === 0) {
    return {
      pagination: {
        current: props.body.page ?? 1,
        limit,
        records: 0,
        pages: 0,
      },
      data: [],
    };
  }
  // 4. Build the WHERE clause with inline patterns
  const sortField: string = props.body.sort ?? "started_at";
  // Build where input inline — complex conditional logic qualifies for intermediate variable
  const whereInput: Prisma.hrm_time_tracking_timersWhereInput = {
    hrm_time_tracking_employee_id: { in: employeeIds },
  };
  if (props.body.status !== undefined) {
    whereInput.status = props.body.status;
  }
  if (props.body.projectId !== undefined) {
    whereInput.hrm_time_tracking_project_id = props.body.projectId;
  }
  if (props.body.taskId !== undefined) {
    whereInput.hrm_time_tracking_task_id =
      props.body.taskId === null ? null : props.body.taskId;
  }
  if (
    props.body.startedAtFrom !== undefined ||
    props.body.startedAtTo !== undefined
  ) {
    const startedAtFilter: Record<string, string> = {};
    if (props.body.startedAtFrom !== undefined) {
      startedAtFilter.gte = props.body.startedAtFrom;
    }
    if (props.body.startedAtTo !== undefined) {
      startedAtFilter.lte = props.body.startedAtTo;
    }
    whereInput.started_at = startedAtFilter satisfies Prisma.DateTimeFilter;
  }
  if (
    props.body.stoppedAtFrom !== undefined ||
    props.body.stoppedAtTo !== undefined
  ) {
    const stoppedAtFilter: Prisma.DateTimeNullableFilter = {
      not: null,
    };
    if (props.body.stoppedAtFrom !== undefined) {
      stoppedAtFilter.gte = props.body.stoppedAtFrom;
    }
    if (props.body.stoppedAtTo !== undefined) {
      stoppedAtFilter.lte = props.body.stoppedAtTo;
    }
    whereInput.stopped_at = stoppedAtFilter;
  }
  // 5. Apply cursor-based pagination
  if (props.body.cursor !== undefined && props.body.cursor !== null) {
    const decoded: {
      value: string;
      id: string;
    } = JSON.parse(Buffer.from(props.body.cursor, "base64").toString("utf-8"));
    if (sortField === "status") {
      whereInput.OR = [
        { status: { lt: decoded.value } },
        { status: decoded.value, id: { lt: decoded.id } },
      ] satisfies Prisma.hrm_time_tracking_timersWhereInput[];
    } else if (sortField === "stopped_at") {
      whereInput.OR = [
        { stopped_at: { not: null, lt: decoded.value } },
        { stopped_at: decoded.value, id: { lt: decoded.id } },
      ] satisfies Prisma.hrm_time_tracking_timersWhereInput[];
    } else {
      whereInput.OR = [
        { started_at: { lt: decoded.value } },
        { started_at: decoded.value, id: { lt: decoded.id } },
      ] satisfies Prisma.hrm_time_tracking_timersWhereInput[];
    }
  }
  // 6. Build ORDER BY with deterministic tiebreaker
  const orderByInput: Prisma.hrm_time_tracking_timersOrderByWithRelationInput =
    sortField === "status"
      ? { status: "desc" }
      : sortField === "stopped_at"
        ? { stopped_at: { sort: "desc", nulls: "last" } }
        : { started_at: "desc" };
  const orderBy: Prisma.hrm_time_tracking_timersOrderByWithRelationInput = {
    ...orderByInput,
    id: "desc",
  };
  // 7. Execute the query (fetch limit + 1 to detect next page)
  const records = await MyGlobal.prisma.hrm_time_tracking_timers.findMany({
    where: whereInput,
    orderBy,
    take: limit + 1,
    ...HrmTimeTrackingTimerAtSummaryTransformer.select(),
  });
  const hasNextPage: boolean = records.length > limit;
  if (hasNextPage) {
    records.pop();
  }
  // 8. Count total matching records for pagination metadata
  const total: number = await MyGlobal.prisma.hrm_time_tracking_timers.count({
    where: whereInput,
  });
  const current: number = props.body.page ?? 1;
  const pages: number = total === 0 ? 0 : Math.ceil(total / limit);
  // 9. Transform records and return paginated response
  return {
    pagination: {
      current,
      limit,
      records: total,
      pages,
    },
    data: await ArrayUtil.asyncMap(
      records,
      HrmTimeTrackingTimerAtSummaryTransformer.transform,
    ),
  };
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
// import { IHrmTimeTrackingTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimer";
// import { IPageIHrmTimeTrackingTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingTimer";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
// import { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
// import { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
// import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
// import { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
// import { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
// import { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchHrmTimeTrackingMemberTimers(props: {
//   member: MemberPayload;
//   body: IHrmTimeTrackingTimer.IRequest;
// }): Promise<IPageIHrmTimeTrackingTimer.ISummary> {
//   const records = await MyGlobal.prisma.hrm_time_tracking_timers.findMany({
//     ...HrmTimeTrackingTimerAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, HrmTimeTrackingTimerAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------