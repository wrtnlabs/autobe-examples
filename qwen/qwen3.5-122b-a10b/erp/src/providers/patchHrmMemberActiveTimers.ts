import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmActiveTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmActiveTimer";
import { IHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmDepartment";
import { IHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployee";
import { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import { IHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmProject";
import { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
import { IHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTask";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmActiveTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmActiveTimer";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmActiveTimerAtSummaryTransformer } from "../transformers/HrmActiveTimerAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmMemberActiveTimers(props: {
  member: MemberPayload;
  body: IHrmActiveTimer.IRequest;
}): Promise<IPageIHrmActiveTimer.ISummary> {
  const employee = await MyGlobal.prisma.hrm_employees.findFirst({
    where: {
      user_id: props.member.id,
      deleted_at: null,
    },
    select: {
      id: true,
      organization_id: true,
    },
  });
  if (!employee) {
    throw new HttpException("Employee record not found", 403);
  }
  const whereInput: Prisma.hrm_active_timersWhereInput = {
    employee: {
      organization_id: employee.organization_id,
      deleted_at: null,
    },
    ...(props.body.employee_id !== undefined && {
      employee_id: props.body.employee_id,
    }),
    ...(props.body.project_id !== undefined && {
      project_id: props.body.project_id,
    }),
    ...(props.body.task_id !== undefined && {
      task_id: props.body.task_id,
    }),
    ...(props.body.start_timestamp_from !== undefined ||
    props.body.start_timestamp_to !== undefined
      ? {
          start_timestamp: {
            ...(props.body.start_timestamp_from !== undefined && {
              gte: new Date(props.body.start_timestamp_from),
            }),
            ...(props.body.start_timestamp_to !== undefined && {
              lte: new Date(props.body.start_timestamp_to),
            }),
          },
        }
      : {}),
  };
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const records = await MyGlobal.prisma.hrm_active_timers.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { start_timestamp: "desc" },
    ...HrmActiveTimerAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.hrm_active_timers.count({
    where: whereInput,
  });
  const data = await ArrayUtil.asyncMap(
    records,
    HrmActiveTimerAtSummaryTransformer.transform,
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: data,
  } satisfies IPageIHrmActiveTimer.ISummary;
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
// import { IHrmActiveTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmActiveTimer";
// import { IPageIHrmActiveTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmActiveTimer";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployee";
// import { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
// import { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
// import { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
// import { IHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmDepartment";
// import { IHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmProject";
// import { IHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTask";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchHrmMemberActiveTimers(props: {
//   member: MemberPayload;
//   body: IHrmActiveTimer.IRequest;
// }): Promise<IPageIHrmActiveTimer.ISummary> {
//   const records = await MyGlobal.prisma.hrm_active_timers.findMany({
//     ...HrmActiveTimerAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, HrmActiveTimerAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------