import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import { IErpHrmTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimer";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIErpHrmTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimer";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTimerAtSummaryTransformer } from "../transformers/ErpHrmTimerAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchErpHrmMemberTimers(props: {
  member: MemberPayload;
  body: IErpHrmTimer.IRequest;
}): Promise<IPageIErpHrmTimer.ISummary> {
  const session =
    await MyGlobal.prisma.erp_hrm_member_sessions.findUniqueOrThrow({
      where: { id: props.member.session_id },
      select: { erp_hrm_organization_id: true },
    });
  const organizationId = session.erp_hrm_organization_id;
  if (organizationId === null) {
    throw new HttpException("No organization selected", 400);
  }
  const limit = props.body.limit ?? 20;
  const page = props.body.page ?? 1;
  const skip = (page - 1) * limit;
  const taskFilterValue =
    props.body.has_task === false
      ? null
      : props.body.task_ids !== undefined && props.body.task_ids.length > 0
        ? { in: props.body.task_ids }
        : props.body.has_task === true
          ? { not: null }
          : undefined;
  const whereInput = {
    employee: {
      erp_hrm_organization_id: organizationId,
      deleted_at: null,
      ...(props.body.employee_ids !== undefined &&
        props.body.employee_ids.length > 0 && {
          id: { in: props.body.employee_ids },
        }),
    },
    ...(props.body.project_ids !== undefined &&
      props.body.project_ids.length > 0 && {
        erp_hrm_project_id: { in: props.body.project_ids },
      }),
    ...(taskFilterValue !== undefined && {
      erp_hrm_task_id: taskFilterValue,
    }),
    ...((props.body.start_from !== undefined ||
      props.body.start_to !== undefined) && {
      start_timestamp: {
        ...(props.body.start_from !== undefined && {
          gte: props.body.start_from,
        }),
        ...(props.body.start_to !== undefined && {
          lte: props.body.start_to,
        }),
      },
    }),
    ...(props.body.search !== undefined && {
      description: {
        contains: props.body.search,
        mode: "insensitive",
      },
    }),
  } satisfies Prisma.erp_hrm_timersWhereInput;
  const data = await MyGlobal.prisma.erp_hrm_timers.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { start_timestamp: "desc" },
    ...ErpHrmTimerAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.erp_hrm_timers.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      ErpHrmTimerAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
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
// import { IErpHrmTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimer";
// import { IPageIErpHrmTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimer";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
// import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
// import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
// import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
// import { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
// import { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchErpHrmMemberTimers(props: {
//   member: MemberPayload;
//   body: IErpHrmTimer.IRequest;
// }): Promise<IPageIErpHrmTimer.ISummary> {
//   const records = await MyGlobal.prisma.erp_hrm_timers.findMany({
//     ...ErpHrmTimerAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, ErpHrmTimerAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------