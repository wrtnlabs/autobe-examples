import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmDepartment";
import { IHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployee";
import { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import { IHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmProject";
import { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
import { IHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTask";
import { IHrmTimeReportItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeReportItem";
import { IHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimelog";
import { IHrmTimesheetTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimesheetTimelog";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTimesheetTimelogTransformer } from "../transformers/HrmTimesheetTimelogTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmMemberOrganizationsOrganizationIdTimesheetsTimesheetId(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
  timesheetId: string & tags.Format<"uuid">;
}): Promise<IHrmTimesheetTimelog> {
  const timesheet = await MyGlobal.prisma.hrm_timesheets.findFirstOrThrow({
    where: {
      id: props.timesheetId,
      deleted_at: null,
      employee: {
        organization_id: props.organizationId,
        deleted_at: null,
      },
    },
    ...HrmTimesheetTimelogTransformer.select(),
  });
  const isEmployeeOwner = timesheet.employee.id === props.member.id;
  if (!isEmployeeOwner) {
    const memberEmployee = await MyGlobal.prisma.hrm_employees.findFirst({
      where: {
        user_id: props.member.id,
        organization_id: props.organizationId,
        deleted_at: null,
      },
      select: {
        role: {
          select: {
            rolePermissions: {
              where: {
                hrmPermission: {
                  permission_name: "time:approve",
                },
              },
              select: {
                id: true,
              },
            },
          },
        },
      },
    });
    const hasTimeApprovePermission =
      memberEmployee?.role?.rolePermissions.length ?? 0 > 0;
    if (!hasTimeApprovePermission) {
      throw new HttpException("Forbidden", 403);
    }
  }
  return await HrmTimesheetTimelogTransformer.transform(timesheet);
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
// import { IHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployee";
// import { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
// import { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
// import { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
// import { IHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmDepartment";
// import { IHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimelog";
// import { IHrmTimeReportItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeReportItem";
// import { IHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmProject";
// import { IHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTask";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getHrmMemberOrganizationsOrganizationIdTimesheetsTimesheetId(props: {
//   member: MemberPayload;
//   organizationId: string & tags.Format<"uuid">;
//   timesheetId: string & tags.Format<"uuid">;
// }): Promise<IHrmTimesheetTimelog> {
//   const record = await MyGlobal.prisma.hrm_timesheets.findFirstOrThrow({
//     ...HrmTimesheetTimelogTransformer.select(),
//     where: { ... },
//   });
//   return await HrmTimesheetTimelogTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------