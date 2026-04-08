import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmContract";
import { IHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmDepartment";
import { IHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployee";
import { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmContract";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmContractAtSummaryTransformer } from "../transformers/HrmContractAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmMemberEmployeesEmployeeIdContracts(props: {
  member: MemberPayload;
  employeeId: string & tags.Format<"uuid">;
  body: IHrmContract.IRequest;
}): Promise<IPageIHrmContract.ISummary> {
  // Step 1: Validate employee exists and get organization context
  const employee = await MyGlobal.prisma.hrm_employees.findUnique({
    where: { id: props.employeeId },
    select: {
      id: true,
      organization_id: true,
      user_id: true,
      role_id: true,
      deleted_at: true,
    },
  });
  if (employee === null || employee.deleted_at !== null) {
    throw new HttpException("Employee not found", 404);
  }
  // Step 2: Check authorization - employee themselves OR has employee:view permission
  const isOwner = employee.user_id === props.member.id;
  if (!isOwner) {
    // Check for employee:view permission through the employee's role
    const employeeRole = await MyGlobal.prisma.hrm_roles.findUnique({
      where: { id: employee.role_id },
      select: {
        id: true,
        rolePermissions: {
          select: {
            hrmPermission: {
              select: {
                permission_name: true,
              },
            },
          },
        },
      },
    });
    if (!employeeRole) {
      throw new HttpException("Forbidden", 403);
    }
    const hasViewPermission = employeeRole.rolePermissions.some(
      (rp) => rp.hrmPermission.permission_name === "employee:view",
    );
    if (!hasViewPermission) {
      throw new HttpException("Forbidden", 403);
    }
  }
  // Step 3: Build where clause with filters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.hrm_contractsWhereInput = {
    hrm_employee_id: props.employeeId,
    deleted_at: null,
    ...(props.body.status === "active" && {
      end_date: null,
    }),
    ...(props.body.status === "historical" && {
      end_date: {
        not: null,
      },
    }),
    ...(props.body.pay_period && {
      pay_period: props.body.pay_period,
    }),
    ...(props.body.date_range && {
      ...(props.body.date_range.start_date && {
        start_date: {
          gte: new Date(props.body.date_range.start_date),
        },
      }),
      ...(props.body.date_range.end_date && {
        end_date: {
          gte: new Date(props.body.date_range.end_date),
        },
      }),
    }),
  };
  // Step 4: Apply sorting
  const sort_by = props.body.sort_by ?? "start_date";
  const sort_order = props.body.sort_order ?? "desc";
  const orderByInput: Prisma.hrm_contractsOrderByWithRelationInput = {
    [sort_by]: sort_order,
  };
  // Step 5: Execute queries
  const records = await MyGlobal.prisma.hrm_contracts.findMany({
    where: whereInput,
    orderBy: orderByInput,
    skip,
    take: limit,
    ...HrmContractAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.hrm_contracts.count({
    where: whereInput,
  });
  // Step 6: Transform results and return paginated response
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      HrmContractAtSummaryTransformer.transform,
    ),
  } satisfies IPageIHrmContract.ISummary;
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
// import { IHrmContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmContract";
// import { IPageIHrmContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmContract";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployee";
// import { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
// import { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
// import { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
// import { IHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmDepartment";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchHrmMemberEmployeesEmployeeIdContracts(props: {
//   member: MemberPayload;
//   employeeId: string & tags.Format<"uuid">;
//   body: IHrmContract.IRequest;
// }): Promise<IPageIHrmContract.ISummary> {
//   const records = await MyGlobal.prisma.hrm_contracts.findMany({
//     ...HrmContractAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, HrmContractAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------