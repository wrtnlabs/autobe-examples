import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
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
  // Get the employee record for this member (timers belong to employees)
  const employee = await MyGlobal.prisma.erp_hrm_employees.findFirst({
    where: {
      erp_hrm_member_id: props.member.id,
      status: "active",
    },
    select: {
      id: true,
      erp_hrm_organization_id: true,
    },
  });
  if (employee === null) {
    throw new HttpException("Employee not found or deactivated", 403);
  }
  // Status filter: 'stopped' returns empty (timers are deleted when converted to timelogs)
  if (props.body.status === "stopped") {
    return {
      pagination: {
        current: (props.body.page ?? 1) satisfies number &
          tags.Type<"int32"> &
          tags.Minimum<0>,
        limit: (props.body.limit ?? 20) satisfies number &
          tags.Type<"int32"> &
          tags.Minimum<0>,
        records: 0 satisfies number & tags.Type<"int32"> & tags.Minimum<0>,
        pages: 0 satisfies number & tags.Type<"int32"> & tags.Minimum<0>,
      },
      data: [],
    };
  }
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build where conditions
  const whereConditions: Prisma.erp_hrm_timersWhereInput = {
    erp_hrm_employee_id: employee.id,
    ...(props.body.project_id !== undefined && {
      erp_hrm_project_id: props.body.project_id,
    }),
    ...(props.body.search !== undefined && {
      description: {
        contains: props.body.search,
        mode: "insensitive",
      },
    }),
  };
  // Execute queries sequentially (not parallel)
  const records = await MyGlobal.prisma.erp_hrm_timers.findMany({
    where: whereConditions,
    skip: skip,
    take: limit,
    orderBy: {
      started_at: "desc",
    },
    ...ErpHrmTimerAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.erp_hrm_timers.count({
    where: whereConditions,
  });
  return {
    pagination: {
      current: page satisfies number & tags.Type<"int32"> & tags.Minimum<0>,
      limit: limit satisfies number & tags.Type<"int32"> & tags.Minimum<0>,
      records: total satisfies number & tags.Type<"int32"> & tags.Minimum<0>,
      pages: Math.ceil(total / limit) satisfies number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
    },
    data: await ArrayUtil.asyncMap(
      records,
      ErpHrmTimerAtSummaryTransformer.transform,
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
// import { IErpHrmTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimer";
// import { IPageIErpHrmTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimer";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
// import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
// import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
// import { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
// import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
// import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
// import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
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