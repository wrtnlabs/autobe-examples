import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmEmployee";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmEmployeeAtSummaryTransformer } from "../transformers/ErpHrmEmployeeAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchErpHrmMemberEmployees(props: {
  member: MemberPayload;
  body: IErpHrmEmployee.IRequest;
}): Promise<IPageIErpHrmEmployee.ISummary> {
  const session =
    await MyGlobal.prisma.erp_hrm_member_sessions.findUniqueOrThrow({
      where: { id: props.member.session_id },
      select: { erp_hrm_organization_id: true },
    });
  if (!session.erp_hrm_organization_id) {
    throw new HttpException("No organization selected", 400);
  }
  const organizationId: string = session.erp_hrm_organization_id;
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 20;
  const skip: number = (page - 1) * limit;
  const whereInput = {
    erp_hrm_organization_id: organizationId,
    deleted_at: null,
    ...(props.body.department_id !== undefined && {
      erp_hrm_department_id: props.body.department_id,
    }),
    ...(props.body.employment_type !== undefined && {
      employment_type: props.body.employment_type,
    }),
    ...(props.body.status !== undefined && {
      status: props.body.status,
    }),
    ...(props.body.search !== undefined &&
      props.body.search !== "" && {
        member: {
          display_name: {
            contains: props.body.search,
            mode: "insensitive" as const,
          },
        },
      }),
  } satisfies Prisma.erp_hrm_employeesWhereInput;
  const sortRaw: string = props.body.sort ?? "name";
  const isDesc: boolean = sortRaw.startsWith("-");
  const field: string = isDesc ? sortRaw.substring(1) : sortRaw;
  const direction: "asc" | "desc" = isDesc ? "desc" : "asc";
  let orderByInput: Prisma.erp_hrm_employeesOrderByWithRelationInput;
  switch (field) {
    case "name":
      orderByInput = { member: { display_name: direction } };
      break;
    case "employment_type":
      orderByInput = { employment_type: direction };
      break;
    case "status":
      orderByInput = { status: direction };
      break;
    case "created_at":
      orderByInput = { created_at: direction };
      break;
    default:
      orderByInput = { member: { display_name: "asc" } };
  }
  const data = await MyGlobal.prisma.erp_hrm_employees.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...ErpHrmEmployeeAtSummaryTransformer.select(),
  });
  const total: number = await MyGlobal.prisma.erp_hrm_employees.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data,
      ErpHrmEmployeeAtSummaryTransformer.transform,
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
// import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
// import { IPageIErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmEmployee";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
// import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
// import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchErpHrmMemberEmployees(props: {
//   member: MemberPayload;
//   body: IErpHrmEmployee.IRequest;
// }): Promise<IPageIErpHrmEmployee.ISummary> {
//   const records = await MyGlobal.prisma.erp_hrm_employees.findMany({
//     ...ErpHrmEmployeeAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, ErpHrmEmployeeAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------