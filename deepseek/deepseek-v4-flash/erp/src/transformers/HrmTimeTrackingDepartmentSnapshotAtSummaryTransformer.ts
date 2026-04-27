import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import { IHrmTimeTrackingDepartmentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartmentSnapshot";
import { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmTimeTrackingDepartmentAtSummaryTransformer } from "./HrmTimeTrackingDepartmentAtSummaryTransformer";
import { HrmTimeTrackingMemberAtSummaryTransformer } from "./HrmTimeTrackingMemberAtSummaryTransformer";

export namespace HrmTimeTrackingDepartmentSnapshotAtSummaryTransformer {
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
        actorMember: HrmTimeTrackingMemberAtSummaryTransformer.select(),
      },
    } satisfies Prisma.hrm_time_tracking_department_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmTimeTrackingDepartmentSnapshot.ISummary> {
    return {
      id: input.id,
      name: input.name,
      description: input.description ?? null,
      parentDepartmentId: input.parent_department_id ?? null,
      changeType: input.change_type,
      createdAt: input.created_at.toISOString(),
      department: await HrmTimeTrackingDepartmentAtSummaryTransformer.transform(
        input.department,
      ),
      actorMember:
        input.actorMember !== null
          ? await HrmTimeTrackingMemberAtSummaryTransformer.transform(
              input.actorMember,
            )
          : null,
    } satisfies IHrmTimeTrackingDepartmentSnapshot.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace HrmTimeTrackingDepartmentSnapshotAtSummaryTransformer {
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
//             hrm_time_tracking_organization_id: true,
//             actorMember: HrmTimeTrackingMemberAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.hrm_time_tracking_department_snapshotsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IHrmTimeTrackingDepartmentSnapshot.ISummary> {
//         return {
//   id: {string},
//   name: {string},
//   description: {string | null},
//   parentDepartmentId: {string | null},
//   changeType: {string},
//   department: await HrmTimeTrackingDepartmentAtSummaryTransformer.transform(input.department),
//   actorMember: input.actorMember ? await HrmTimeTrackingMemberAtSummaryTransformer.transform(input.actorMember) : null,
//   createdAt: {string},
//         };
//       }
//     }
//--------------------------------------------------------------