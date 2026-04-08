import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { IHrmPlatformTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheet";
import { IHrmPlatformTimesheetAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheetAction";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformTimesheetActionTransformer } from "../transformers/HrmPlatformTimesheetActionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmPlatformMemberTimesheetsTimesheetIdActionsActionId(props: {
  member: MemberPayload;
  timesheetId: string & tags.Format<"uuid">;
  actionId: string & tags.Format<"uuid">;
}): Promise<IHrmPlatformTimesheetAction> {
  const record =
    await MyGlobal.prisma.hrm_platform_timesheet_actions.findFirstOrThrow({
      ...HrmPlatformTimesheetActionTransformer.select(),
      where: {
        id: props.actionId,
        hrm_platform_timesheet_id: props.timesheetId,
      },
    });
  const timesheet =
    await MyGlobal.prisma.hrm_platform_timesheets.findFirstOrThrow({
      where: {
        id: props.timesheetId,
      },
      select: {
        hrm_platform_employee_id: true,
      },
    });
  const timesheetEmployee =
    await MyGlobal.prisma.hrm_platform_employees.findFirstOrThrow({
      where: {
        id: timesheet.hrm_platform_employee_id,
      },
      select: {
        hrm_platform_organization_id: true,
      },
    });
  const memberEmployee = await MyGlobal.prisma.hrm_platform_employees.findFirst(
    {
      where: {
        hrm_platform_member_id: props.member.id,
      },
      select: {
        hrm_platform_organization_id: true,
      },
    },
  );
  if (
    memberEmployee === null ||
    memberEmployee.hrm_platform_organization_id !==
      timesheetEmployee.hrm_platform_organization_id
  ) {
    throw new HttpException("Forbidden", 403);
  }
  return await HrmPlatformTimesheetActionTransformer.transform(record);
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
// import { IHrmPlatformTimesheetAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheetAction";
// import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
// import { IHrmPlatformTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheet";
// import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
// import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
// import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
// import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getHrmPlatformMemberTimesheetsTimesheetIdActionsActionId(props: {
//   member: MemberPayload;
//   timesheetId: string & tags.Format<"uuid">;
//   actionId: string & tags.Format<"uuid">;
// }): Promise<IHrmPlatformTimesheetAction> {
//   const record = await MyGlobal.prisma.hrm_platform_timesheet_actions.findFirstOrThrow({
//     ...HrmPlatformTimesheetActionTransformer.select(),
//     where: { ... },
//   });
//   return await HrmPlatformTimesheetActionTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------