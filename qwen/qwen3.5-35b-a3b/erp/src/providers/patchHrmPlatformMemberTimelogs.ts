import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformTimelog";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformTimelogAtSummaryTransformer } from "../transformers/HrmPlatformTimelogAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmPlatformMemberTimelogs(props: {
  member: MemberPayload;
  body: IHrmPlatformTimelog.IRequest;
}): Promise<IPageIHrmPlatformTimelog.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  if (limit < 1 || limit > 100) {
    throw new HttpException("Limit must be between 1 and 100", 400);
  }
  const skip = (page - 1) * limit;
  const session = await MyGlobal.prisma.hrm_platform_member_sessions.findFirst({
    where: {
      id: props.member.session_id,
      expired_at: { gt: new Date() },
      hrm_platform_member_id: props.member.id,
    },
  });
  if (session === null) {
    throw new HttpException("Session invalid", 403);
  }
  const member = await MyGlobal.prisma.hrm_platform_members.findFirst({
    where: { id: session.hrm_platform_member_id },
  });
  if (member === null) {
    throw new HttpException("Member not found", 404);
  }
  const employee = await MyGlobal.prisma.hrm_platform_employees.findFirst({
    where: { hrm_platform_member_id: member.id },
    include: { role: true },
  });
  if (employee === null) {
    throw new HttpException("Employee not found", 404);
  }
  const isTimeManager = employee.role?.name === "Manager";
  const isOwner = employee.role?.name === "Owner";
  const where: Prisma.hrm_platform_timelogsWhereInput = {
    deleted_at: null,
  };
  if (props.body.employee_id !== undefined) {
    if (!isTimeManager && !isOwner) {
      throw new HttpException("Unauthorized", 403);
    }
    where.employee_id = props.body.employee_id;
  }
  if (props.body.project_id !== undefined) {
    where.project_id = props.body.project_id;
  }
  if (props.body.task_id !== undefined) {
    where.task_id = props.body.task_id;
  }
  if (props.body.start_date !== undefined) {
    where.start_datetime = { gte: new Date(props.body.start_date) };
  }
  if (props.body.end_date !== undefined) {
    where.end_datetime = { lte: new Date(props.body.end_date) };
  }
  if (props.body.billable !== undefined) {
    where.billable = props.body.billable;
  }
  if (!isTimeManager && !isOwner) {
    where.employee_id = employee.id;
  }
  const sort = props.body.sort_by ?? "created_at";
  const sortOrder = props.body.sort_order ?? "desc";
  const orderBy: Prisma.hrm_platform_timelogsOrderByWithRelationInput =
    sort === "created_at"
      ? { created_at: sortOrder }
      : sort === "start_datetime"
        ? { start_datetime: sortOrder }
        : sort === "end_datetime"
          ? { end_datetime: sortOrder }
          : sort === "duration_minutes"
            ? { duration_minutes: sortOrder }
            : { created_at: sortOrder };
  const records = await MyGlobal.prisma.hrm_platform_timelogs.findMany({
    ...HrmPlatformTimelogAtSummaryTransformer.select(),
    where,
    orderBy,
    skip,
    take: limit,
  });
  const total = await MyGlobal.prisma.hrm_platform_timelogs.count({
    where,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: total > 0 ? Math.ceil(total / limit) : 0,
    },
    data: await ArrayUtil.asyncMap(
      records,
      HrmPlatformTimelogAtSummaryTransformer.transform,
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
// import { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
// import { IPageIHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformTimelog";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
// import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
// import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
// import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
// import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
// import { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
// import { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchHrmPlatformMemberTimelogs(props: {
//   member: MemberPayload;
//   body: IHrmPlatformTimelog.IRequest;
// }): Promise<IPageIHrmPlatformTimelog.ISummary> {
//   const records = await MyGlobal.prisma.hrm_platform_timelogs.findMany({
//     ...HrmPlatformTimelogAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, HrmPlatformTimelogAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------