import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import { IHrmTimeTrackingDepartmentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartmentSnapshot";
import { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmTimeTrackingDepartmentAtSummaryTransformer } from "./HrmTimeTrackingDepartmentAtSummaryTransformer";
import { HrmTimeTrackingMemberAtSummaryTransformer } from "./HrmTimeTrackingMemberAtSummaryTransformer";
import { HrmTimeTrackingOrganizationAtSummaryTransformer } from "./HrmTimeTrackingOrganizationAtSummaryTransformer";

export namespace HrmTimeTrackingDepartmentSnapshotTransformer {
  export type Payload = Prisma.hrm_time_tracking_department_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        description: true,
        parent_department_id: true,
        change_type: true,
        created_at: true,
        department: HrmTimeTrackingDepartmentAtSummaryTransformer.select(),
        organization: HrmTimeTrackingOrganizationAtSummaryTransformer.select(),
        actorMember: HrmTimeTrackingMemberAtSummaryTransformer.select(),
      },
    } satisfies Prisma.hrm_time_tracking_department_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmTimeTrackingDepartmentSnapshot> {
    return {
      id: input.id,
      department: await HrmTimeTrackingDepartmentAtSummaryTransformer.transform(
        input.department,
      ),
      organization:
        await HrmTimeTrackingOrganizationAtSummaryTransformer.transform(
          input.organization,
        ),
      actor: input.actorMember
        ? await HrmTimeTrackingMemberAtSummaryTransformer.transform(
            input.actorMember,
          )
        : null,
      name: input.name,
      description: input.description,
      parent_department_id: input.parent_department_id,
      change_type: input.change_type,
      created_at: input.created_at.toISOString(),
    } satisfies IHrmTimeTrackingDepartmentSnapshot;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace HrmTimeTrackingDepartmentSnapshotTransformer {
//       export type Payload = Prisma.hrm_time_tracking_department_snapshotsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             name: true,
//             description: true,
//             parent_department_id: true,
//             change_type: true,
//             created_at: true,
//             department: HrmTimeTrackingDepartmentAtSummaryTransformer.select(),
//             organization: HrmTimeTrackingOrganizationAtSummaryTransformer.select(),
//             actorMember: HrmTimeTrackingMemberAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.hrm_time_tracking_department_snapshotsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IHrmTimeTrackingDepartmentSnapshot> {
//         return {
//   id: {string},
//   department: await HrmTimeTrackingDepartmentAtSummaryTransformer.transform(input.department),
//   organization: await HrmTimeTrackingOrganizationAtSummaryTransformer.transform(input.organization),
//   actor: input.actorMember ? await HrmTimeTrackingMemberAtSummaryTransformer.transform(input.actorMember) : null,
//   name: {string},
//   description: {string | null},
//   parent_department_id: {string | null},
//   change_type: {string},
//   created_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------