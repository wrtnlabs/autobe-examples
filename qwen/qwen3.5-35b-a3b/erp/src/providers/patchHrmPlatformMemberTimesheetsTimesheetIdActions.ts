import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { IHrmPlatformTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheet";
import { IHrmPlatformTimesheetAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheetAction";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmPlatformTimesheetAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformTimesheetAction";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformTimesheetActionAtSummaryTransformer } from "../transformers/HrmPlatformTimesheetActionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmPlatformMemberTimesheetsTimesheetIdActions(props: {
  member: MemberPayload;
  timesheetId: string & tags.Format<"uuid">;
  body: IHrmPlatformTimesheetAction.IRequest;
}): Promise<IPageIHrmPlatformTimesheetAction.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 10;
  const skip = (page - 1) * limit;
  await MyGlobal.prisma.hrm_platform_timesheets.findUniqueOrThrow({
    where: { id: props.timesheetId, deleted_at: null },
  });
  const whereInput: Prisma.hrm_platform_timesheet_actionsWhereInput = {
    hrm_platform_timesheet_id: props.timesheetId,
    ...(props.body.action !== undefined && { action: props.body.action }),
    ...(props.body.actor_id !== undefined && {
      actor_id: props.body.actor_id,
    }),
    ...(props.body.start_date !== undefined && {
      created_at: { gte: new Date(props.body.start_date) },
    }),
    ...(props.body.end_date !== undefined && {
      created_at: {
        lte: new Date(props.body.end_date),
      },
    }),
  } satisfies Prisma.hrm_platform_timesheet_actionsWhereInput;
  const [records, total] = await Promise.all([
    MyGlobal.prisma.hrm_platform_timesheet_actions.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...HrmPlatformTimesheetActionAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.hrm_platform_timesheet_actions.count({
      where: whereInput,
    }),
  ]);
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      HrmPlatformTimesheetActionAtSummaryTransformer.transform,
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
// import { IHrmPlatformTimesheetAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheetAction";
// import { IPageIHrmPlatformTimesheetAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformTimesheetAction";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
// import { IHrmPlatformTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheet";
// import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
// import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
// import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
// import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchHrmPlatformMemberTimesheetsTimesheetIdActions(props: {
//   member: MemberPayload;
//   timesheetId: string & tags.Format<"uuid">;
//   body: IHrmPlatformTimesheetAction.IRequest;
// }): Promise<IPageIHrmPlatformTimesheetAction.ISummary> {
//   const records = await MyGlobal.prisma.hrm_platform_timesheet_actions.findMany({
//     ...HrmPlatformTimesheetActionAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, HrmPlatformTimesheetActionAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------