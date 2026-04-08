import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import { IHrmPlatformProjectMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectMembership";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmPlatformEmployeeAtSummaryTransformer } from "./HrmPlatformEmployeeAtSummaryTransformer";
import { HrmPlatformProjectAtSummaryTransformer } from "./HrmPlatformProjectAtSummaryTransformer";

export namespace HrmPlatformProjectMembershipAtSummaryTransformer {
  export type Payload = Prisma.hrm_platform_project_membershipsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        organization_id: true,
        role: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        employee: HrmPlatformEmployeeAtSummaryTransformer.select(),
        project: HrmPlatformProjectAtSummaryTransformer.select(),
      },
    } satisfies Prisma.hrm_platform_project_membershipsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmPlatformProjectMembership.ISummary> {
    return {
      id: input.id,
      employee: await HrmPlatformEmployeeAtSummaryTransformer.transform(
        input.employee,
      ),
      project: await HrmPlatformProjectAtSummaryTransformer.transform(
        input.project,
      ),
      role: input.role,
      created_at: input.created_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    } satisfies IHrmPlatformProjectMembership.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace HrmPlatformProjectMembershipAtSummaryTransformer {
//       export type Payload = Prisma.hrm_platform_project_membershipsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             organization_id: true,
//             role: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             employee: HrmPlatformEmployeeAtSummaryTransformer.select(),
//             project: HrmPlatformProjectAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.hrm_platform_project_membershipsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IHrmPlatformProjectMembership.ISummary> {
//         return {
//   id: {string},
//   employee: await HrmPlatformEmployeeAtSummaryTransformer.transform(input.employee),
//   project: await HrmPlatformProjectAtSummaryTransformer.transform(input.project),
//   role: {string},
//   created_at: {string},
//   deleted_at: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------