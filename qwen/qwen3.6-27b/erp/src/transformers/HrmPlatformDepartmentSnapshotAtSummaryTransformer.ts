import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformDepartmentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartmentSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmPlatformDepartmentAtSummaryTransformer } from "./HrmPlatformDepartmentAtSummaryTransformer";

export namespace HrmPlatformDepartmentSnapshotAtSummaryTransformer {
  export type Payload = Prisma.hrm_platform_department_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        parent_department_id: true,
        snapshot_name: true,
        snapshot_description: true,
        created_at: true,
        department: HrmPlatformDepartmentAtSummaryTransformer.select(),
      },
    } satisfies Prisma.hrm_platform_department_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmPlatformDepartmentSnapshot.ISummary> {
    return {
      id: input.id,
      department: await HrmPlatformDepartmentAtSummaryTransformer.transform(
        input.department,
      ),
      parentDepartment:
        input.parent_department_id != null
          ? {
              id: input.parent_department_id,
              name: "",
              parentDepartment: null,
              created_at: new Date(0).toISOString(),
              updated_at: new Date(0).toISOString(),
              deleted_at: null,
            }
          : null,
      snapshotName: input.snapshot_name,
      snapshotDescription: input.snapshot_description ?? null,
      createdAt: input.created_at.toISOString(),
    };
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace HrmPlatformDepartmentSnapshotAtSummaryTransformer {
//       export type Payload = Prisma.hrm_platform_department_snapshotsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             parent_department_id: true,
//             snapshot_name: true,
//             snapshot_description: true,
//             created_at: true,
//             hrm_platform_department_id: true,
//             ...
//           },
//         } satisfies Prisma.hrm_platform_department_snapshotsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IHrmPlatformDepartmentSnapshot.ISummary> {
//         return {
//   id: {string},
//   department: {IHrmPlatformDepartment.ISummary},
//   parentDepartment: {IHrmPlatformDepartment.ISummary | null},
//   snapshotName: {string},
//   snapshotDescription: {string | null},
//   createdAt: {string},
//         };
//       }
//     }
//--------------------------------------------------------------