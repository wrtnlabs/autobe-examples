import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
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
import { ErpHrmProjectAtSummaryTransformer } from "./ErpHrmProjectAtSummaryTransformer";

export namespace ErpHrmProjectMemberTransformer {
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
        project: ErpHrmProjectAtSummaryTransformer.select(),
      },
    } satisfies Prisma.erp_hrm_project_membersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IErpHrmProjectMember> {
    return {
      id: input.id,
      role: input.role,
      employee: await ErpHrmEmployeeAtSummaryTransformer.transform(
        input.employee,
      ),
      project: await ErpHrmProjectAtSummaryTransformer.transform(input.project),
      joined_at: input.joined_at.toISOString(),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    } satisfies IErpHrmProjectMember;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ErpHrmProjectMemberTransformer {
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
//             project: ErpHrmProjectAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.erp_hrm_project_membersFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IErpHrmProjectMember> {
//         return {
//   id: {string},
//   role: {string},
//   employee: await ErpHrmEmployeeAtSummaryTransformer.transform(input.employee),
//   project: await ErpHrmProjectAtSummaryTransformer.transform(input.project),
//   joined_at: {string},
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------