import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmDepartment";
import { IHrmEmployeeSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployeeSnapshot";
import { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmDepartmentAtSummaryTransformer } from "./HrmDepartmentAtSummaryTransformer";
import { HrmMemberAtSummaryTransformer } from "./HrmMemberAtSummaryTransformer";
import { HrmOrganizationAtSummaryTransformer } from "./HrmOrganizationAtSummaryTransformer";
import { HrmRoleAtSummaryTransformer } from "./HrmRoleAtSummaryTransformer";

export namespace HrmEmployeeSnapshotTransformer {
  export type Payload = Prisma.hrm_employee_snapshotsGetPayload<
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
        organization: HrmOrganizationAtSummaryTransformer.select(),
        user: HrmMemberAtSummaryTransformer.select(),
        role: HrmRoleAtSummaryTransformer.select(),
        department: HrmDepartmentAtSummaryTransformer.select(),
        hrmEmployee: { select: { id: true } },
      },
    } satisfies Prisma.hrm_employee_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmEmployeeSnapshot> {
    return {
      id: input.id,
      organization: await HrmOrganizationAtSummaryTransformer.transform(
        input.organization,
      ),
      user: input.user
        ? await HrmMemberAtSummaryTransformer.transform(input.user)
        : null,
      role: input.role
        ? await HrmRoleAtSummaryTransformer.transform(input.role)
        : null,
      department: input.department
        ? await HrmDepartmentAtSummaryTransformer.transform(input.department)
        : null,
      position: input.position ?? undefined,
      employment_type: input.employment_type,
      status: input.status,
      created_at: input.created_at.toISOString(),
    } satisfies IHrmEmployeeSnapshot;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace HrmEmployeeSnapshotTransformer {
//       export type Payload = Prisma.hrm_employee_snapshotsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             position: true,
//             employment_type: true,
//             status: true,
//             created_at: true,
//             hrm_employee_id: true,
//             organization: HrmOrganizationAtSummaryTransformer.select(),
//             user: HrmMemberAtSummaryTransformer.select(),
//             role: HrmRoleAtSummaryTransformer.select(),
//             department: HrmDepartmentAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.hrm_employee_snapshotsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IHrmEmployeeSnapshot> {
//         return {
//   id: {string},
//   organization: await HrmOrganizationAtSummaryTransformer.transform(input.organization),
//   user: input.user ? await HrmMemberAtSummaryTransformer.transform(input.user) : null,
//   role: input.role ? await HrmRoleAtSummaryTransformer.transform(input.role) : null,
//   department: input.department ? await HrmDepartmentAtSummaryTransformer.transform(input.department) : null,
//   position: {string | null},
//   employment_type: {string},
//   status: {string},
//   created_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------