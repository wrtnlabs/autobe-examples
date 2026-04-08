import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmDepartment";
import { IHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployee";
import { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import { IHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmProject";
import { IHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmProjectMember";
import { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmEmployeeAtSummaryTransformer } from "./HrmEmployeeAtSummaryTransformer";
import { HrmProjectAtSummaryTransformer } from "./HrmProjectAtSummaryTransformer";

export namespace HrmProjectMemberAtSummaryTransformer {
  export type Payload = Prisma.hrm_project_membersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        role: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        project: HrmProjectAtSummaryTransformer.select(),
        employee: HrmEmployeeAtSummaryTransformer.select(),
      },
    } satisfies Prisma.hrm_project_membersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmProjectMember.ISummary> {
    return {
      id: input.id,
      role: typia.assert<"member" | "project-lead">(input.role),
      created_at: toISOStringSafe(input.created_at),
      employee: await HrmEmployeeAtSummaryTransformer.transform(input.employee),
      project: await HrmProjectAtSummaryTransformer.transform(input.project),
    } satisfies IHrmProjectMember.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace HrmProjectMemberAtSummaryTransformer {
//       export type Payload = Prisma.hrm_project_membersGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             role: true,
//             created_at: true,
//             ...
//           },
//         } satisfies Prisma.hrm_project_membersFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IHrmProjectMember.ISummary> {
//         return {
//   id: {string},
//   role: {"member" | "project-lead"},
//   created_at: {string},
//   employee: {IHrmEmployee.ISummary},
//   project: {IHrmProject.ISummary},
//         };
//       }
//     }
//--------------------------------------------------------------