import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ErpHrmMemberAtSummaryTransformer {
  export type Payload = Prisma.erp_hrm_membersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        email: true,
        display_name: true,
        avatar_image: true,
        phone_number: true,
        employees: {
          select: {
            id: true,
            position: true,
            employment_type: true,
            status: true,
            role: {
              select: {
                name: true,
              },
            },
            department: {
              select: {
                name: true,
              },
            },
          },
        } satisfies Prisma.erp_hrm_employeesFindManyArgs,
      },
    } satisfies Prisma.erp_hrm_membersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IErpHrmMember.ISummary> {
    const employee = input.employees[0];
    if (!employee) {
      throw new Error(
        "Employee record not found for the current organization context.",
      );
    }
    return {
      id: input.id,
      email: input.email,
      display_name: input.display_name,
      avatar_image: input.avatar_image ?? null,
      phone_number: input.phone_number ?? null,
      employee_id: employee.id,
      position: employee.position ?? "",
      employment_type: employee.employment_type,
      status: employee.status,
      role_name: employee.role.name,
      department_name: employee.department?.name ?? null,
    } satisfies IErpHrmMember.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ErpHrmMemberAtSummaryTransformer {
//       export type Payload = Prisma.erp_hrm_membersGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             email: true,
//             password_hash: true,
//             display_name: true,
//             avatar_image: true,
//             phone_number: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//           },
//         } satisfies Prisma.erp_hrm_membersFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IErpHrmMember.ISummary> {
//         return {
//   id: {string},
//   email: {string},
//   display_name: {string},
//   avatar_image: {string | null},
//   phone_number: {string | null},
//   employee_id: {string},
//   position: {string},
//   employment_type: {string},
//   status: {string},
//   role_name: {string},
//   department_name: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------