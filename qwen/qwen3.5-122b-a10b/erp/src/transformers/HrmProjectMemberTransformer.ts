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

export namespace HrmProjectMemberTransformer {
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
  export async function transform(input: Payload): Promise<IHrmProjectMember> {
    return {
      id: input.id,
      role: input.role,
      project: await HrmProjectAtSummaryTransformer.transform(input.project),
      employee: await HrmEmployeeAtSummaryTransformer.transform(input.employee),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    } satisfies IHrmProjectMember;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace HrmProjectMemberTransformer {
//       export type Payload = Prisma.hrm_project_membersGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             role: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             project: HrmProjectAtSummaryTransformer.select(),
//             employee: HrmEmployeeAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.hrm_project_membersFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IHrmProjectMember> {
//         return {
//   id: {string},
//   role: {string},
//   project: await HrmProjectAtSummaryTransformer.transform(input.project),
//   employee: await HrmEmployeeAtSummaryTransformer.transform(input.employee),
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------