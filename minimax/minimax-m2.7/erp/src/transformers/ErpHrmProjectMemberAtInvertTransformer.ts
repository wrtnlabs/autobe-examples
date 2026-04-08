import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ErpHrmEmployeeAtSummaryTransformer } from "./ErpHrmEmployeeAtSummaryTransformer";
import { ErpHrmProjectAtSummaryTransformer } from "./ErpHrmProjectAtSummaryTransformer";

export namespace ErpHrmProjectMemberAtInvertTransformer {
  export type Payload = Prisma.erp_hrm_project_membersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        assigned_role: true,
        created_at: true,
        updated_at: true,
        employee: ErpHrmEmployeeAtSummaryTransformer.select(),
        project: ErpHrmProjectAtSummaryTransformer.select(),
      },
    } satisfies Prisma.erp_hrm_project_membersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IErpHrmProjectMember.IInvert> {
    return {
      id: input.id,
      assignedRole: input.assigned_role,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      employee: await ErpHrmEmployeeAtSummaryTransformer.transform(
        input.employee,
      ),
      project: await ErpHrmProjectAtSummaryTransformer.transform(input.project),
    } satisfies IErpHrmProjectMember.IInvert;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ErpHrmProjectMemberAtInvertTransformer {
//       export type Payload = Prisma.erp_hrm_project_membersGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             assigned_role: true,
//             created_at: true,
//             updated_at: true,
//             employee: ErpHrmEmployeeAtSummaryTransformer.select(),
//             project: ErpHrmProjectAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.erp_hrm_project_membersFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IErpHrmProjectMember.IInvert> {
//         return {
//   id: {string},
//   assignedRole: {string},
//   createdAt: {string},
//   updatedAt: {string},
//   employee: await ErpHrmEmployeeAtSummaryTransformer.transform(input.employee),
//   project: await ErpHrmProjectAtSummaryTransformer.transform(input.project),
//         };
//       }
//     }
//--------------------------------------------------------------