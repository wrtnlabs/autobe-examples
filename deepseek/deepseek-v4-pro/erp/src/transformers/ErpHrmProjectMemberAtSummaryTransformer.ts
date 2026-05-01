import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ErpHrmEmployeeAtSummaryTransformer } from "./ErpHrmEmployeeAtSummaryTransformer";

export namespace ErpHrmProjectMemberAtSummaryTransformer {
  export type Payload = Prisma.erp_hrm_project_membersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        role: true,
        joined_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        employee: ErpHrmEmployeeAtSummaryTransformer.select(),
        project: {
          select: {
            id: true,
          },
        } satisfies Prisma.erp_hrm_projectsFindManyArgs,
      },
    } satisfies Prisma.erp_hrm_project_membersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IErpHrmProjectMember.ISummary> {
    return {
      id: input.id,
      role: input.role,
      joined_at: input.joined_at.toISOString(),
      employee: await ErpHrmEmployeeAtSummaryTransformer.transform(
        input.employee,
      ),
    };
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ErpHrmProjectMemberAtSummaryTransformer {
//       export type Payload = Prisma.erp_hrm_project_membersGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             role: true,
//             joined_at: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             employee: ErpHrmEmployeeAtSummaryTransformer.select(),
//             erp_hrm_project_id: true,
//           },
//         } satisfies Prisma.erp_hrm_project_membersFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IErpHrmProjectMember.ISummary> {
//         return {
//   id: {string},
//   role: {string},
//   joined_at: {string},
//   employee: await ErpHrmEmployeeAtSummaryTransformer.transform(input.employee),
//         };
//       }
//     }
//--------------------------------------------------------------