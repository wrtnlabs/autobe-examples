import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmDepartment";
import { IHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployee";
import { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
import { IHrmTimesheetTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimesheetTimelog";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmTimesheetTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimesheetTimelog";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTimesheetTimelogAtSummaryTransformer } from "../transformers/HrmTimesheetTimelogAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmMemberOrganizationsOrganizationCodeTimesheets(props: {
  member: MemberPayload;
  organizationCode: string;
  body: IHrmTimesheetTimelog.IRequest;
}): Promise<IPageIHrmTimesheetTimelog.ISummary> {
  const organization = await MyGlobal.prisma.hrm_organizations.findFirst({
    where: {
      id: props.organizationCode,
      deleted_at: null,
    },
  });
  if (organization === null) {
    throw new HttpException("Organization not found", 404);
  }
  const employee = await MyGlobal.prisma.hrm_employees.findFirst({
    where: {
      user_id: props.member.id,
      organization_id: organization.id,
      deleted_at: null,
    },
  });
  if (employee === null) {
    throw new HttpException(
      "Employee record not found in this organization",
      404,
    );
  }
  let hasTimeManagePermission = false;
  if (employee.role_id !== null) {
    const rolePermission = await MyGlobal.prisma.hrm_role_permissions.findFirst(
      {
        where: {
          hrm_role_id: employee.role_id,
          hrmPermission: {
            permission_name: "time:manage",
          },
        },
      },
    );
    hasTimeManagePermission = rolePermission !== null;
  }
  const whereInput: Prisma.hrm_timesheetsWhereInput = {
    deleted_at: null,
    ...(hasTimeManagePermission === false
      ? {
          hrm_employee_id: employee.id,
        }
      : {}),
    ...(props.body.status !== undefined
      ? {
          status: props.body.status,
        }
      : {}),
    ...(props.body.week_start_date_gte !== undefined
      ? {
          week_start_date: {
            gte: new Date(props.body.week_start_date_gte),
          },
        }
      : {}),
    ...(props.body.week_start_date_lte !== undefined
      ? {
          week_start_date: {
            lte: new Date(props.body.week_start_date_lte),
          },
        }
      : {}),
  } satisfies Prisma.hrm_timesheetsWhereInput;
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 10;
  const skip = (page - 1) * limit;
  const records = await MyGlobal.prisma.hrm_timesheets.findMany({
    where: whereInput,
    orderBy: { week_start_date: "desc" },
    skip,
    take: limit,
    ...HrmTimesheetTimelogAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.hrm_timesheets.count({
    where: whereInput,
  });
  const data = await ArrayUtil.asyncMap(
    records,
    HrmTimesheetTimelogAtSummaryTransformer.transform,
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: data,
  } satisfies IPageIHrmTimesheetTimelog.ISummary;
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
// import { IHrmTimesheetTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimesheetTimelog";
// import { IPageIHrmTimesheetTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimesheetTimelog";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployee";
// import { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
// import { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
// import { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
// import { IHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmDepartment";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchHrmMemberOrganizationsOrganizationCodeTimesheets(props: {
//   member: MemberPayload;
//   organizationCode: string;
//   body: IHrmTimesheetTimelog.IRequest;
// }): Promise<IPageIHrmTimesheetTimelog.ISummary> {
//   const records = await MyGlobal.prisma.hrm_timesheets.findMany({
//     ...HrmTimesheetTimelogAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, HrmTimesheetTimelogAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------