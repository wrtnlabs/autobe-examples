import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
import { IHrmPlatformTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheet";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { HrmPlatformTimesheetCollector } from "../collectors/HrmPlatformTimesheetCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformTimesheetTransformer } from "../transformers/HrmPlatformTimesheetTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmPlatformMemberTimesheets(props: {
  member: MemberPayload;
  body: IHrmPlatformTimesheet.ICreate;
}): Promise<IHrmPlatformTimesheet> {
  const { start_date, end_date, hrm_platform_employee_id, notes } = props.body;
  const startDate = new Date(start_date);
  const endDate = new Date(end_date);
  const dayOfWeekStart = startDate.getDay();
  if (dayOfWeekStart !== 1) {
    throw new HttpException("start_date must be a Monday", 400);
  }
  const expectedEndDate = new Date(startDate);
  expectedEndDate.setDate(expectedEndDate.getDate() + 6);
  if (endDate.getTime() !== expectedEndDate.getTime()) {
    throw new HttpException("end_date must be 6 days after start_date", 400);
  }
  const employee =
    await MyGlobal.prisma.hrm_platform_employees.findUniqueOrThrow({
      where: { id: hrm_platform_employee_id },
      select: { id: true, hrm_platform_member_id: true },
    });
  if (employee.hrm_platform_member_id !== props.member.id) {
    throw new HttpException("You can only create timesheets for yourself", 403);
  }
  let record: Awaited<
    ReturnType<(typeof HrmPlatformTimesheetTransformer)["transform"]>
  >;
  try {
    record = await HrmPlatformTimesheetTransformer.transform(
      await MyGlobal.prisma.hrm_platform_timesheets.create({
        data: await HrmPlatformTimesheetCollector.collect({ body: props.body }),
        ...HrmPlatformTimesheetTransformer.select(),
      }),
    );
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new HttpException(
        "A timesheet already exists for this employee during this week period",
        409,
      );
    }
    throw error;
  }
  return record;
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
// import { IHrmPlatformTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheet";
// import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
// import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
// import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
// import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
// import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
// import { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
// import { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
// import { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postHrmPlatformMemberTimesheets(props: {
//   member: MemberPayload;
//   body: IHrmPlatformTimesheet.ICreate;
// }): Promise<IHrmPlatformTimesheet> {
//   const record = await MyGlobal.prisma.hrm_platform_timesheets.create({
//     data: await HrmPlatformTimesheetCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...HrmPlatformTimesheetTransformer.select(),
//   });
//   return await HrmPlatformTimesheetTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------