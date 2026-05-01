import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ErpHrmDepartmentAtSummaryTransformer } from "./ErpHrmDepartmentAtSummaryTransformer";
import { ErpHrmMemberAtSummaryTransformer } from "./ErpHrmMemberAtSummaryTransformer";
import { ErpHrmRoleAtSummaryTransformer } from "./ErpHrmRoleAtSummaryTransformer";

export namespace ErpHrmEmployeeAtSummaryTransformer {
  export type Payload = Prisma.erp_hrm_employeesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        position: true,
        employment_type: true,
        status: true,
        created_at: true,
        updated_at: true,
        member: ErpHrmMemberAtSummaryTransformer.select(),
        role: ErpHrmRoleAtSummaryTransformer.select(),
        department: ErpHrmDepartmentAtSummaryTransformer.select(),
      },
    } satisfies Prisma.erp_hrm_employeesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IErpHrmEmployee.ISummary> {
    return {
      id: input.id,
      member: await ErpHrmMemberAtSummaryTransformer.transform(input.member),
      role: await ErpHrmRoleAtSummaryTransformer.transform(input.role),
      department: input.department
        ? await ErpHrmDepartmentAtSummaryTransformer.transform(input.department)
        : null,
      position: input.position ?? null,
      employment_type: input.employment_type,
      status: input.status,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    } satisfies IErpHrmEmployee.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ErpHrmEmployeeAtSummaryTransformer {
//       export type Payload = Prisma.erp_hrm_employeesGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             erp_hrm_organization_id: true,
//             position: true,
//             employment_type: true,
//             status: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             member: ErpHrmMemberAtSummaryTransformer.select(),
//             role: ErpHrmRoleAtSummaryTransformer.select(),
//             department: ErpHrmDepartmentAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.erp_hrm_employeesFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IErpHrmEmployee.ISummary> {
//         return {
//   id: {string},
//   member: await ErpHrmMemberAtSummaryTransformer.transform(input.member),
//   role: await ErpHrmRoleAtSummaryTransformer.transform(input.role),
//   department: input.department ? await ErpHrmDepartmentAtSummaryTransformer.transform(input.department) : null,
//   position: {string | null},
//   employment_type: {string},
//   status: {string},
//   created_at: {string},
//   updated_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------