import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformDepartmentsSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartmentsSnapshot";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmPlatformDepartmentAtSummaryTransformer } from "./HrmPlatformDepartmentAtSummaryTransformer";

export namespace HrmPlatformDepartmentsSnapshotTransformer {
  export type Payload = Prisma.hrm_platform_departments_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        description: true,
        color: true,
        parent_department_id: true,
        fiscal_start_month: true,
        timezone: true,
        status: true,
        created_at: true,
        updated_at: true,
        department: HrmPlatformDepartmentAtSummaryTransformer.select(),
      },
    } satisfies Prisma.hrm_platform_departments_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmPlatformDepartmentsSnapshot> {
    return {
      id: input.id,
      department: await HrmPlatformDepartmentAtSummaryTransformer.transform(
        input.department,
      ),
      name: input.name,
      description: input.description ?? undefined,
      color: input.color ?? undefined,
      parentDepartment: null,
      fiscalStartMonth: input.fiscal_start_month ?? undefined,
      timezone: input.timezone ?? undefined,
      status: input.status,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
    } satisfies IHrmPlatformDepartmentsSnapshot;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace HrmPlatformDepartmentsSnapshotTransformer {
//       export type Payload = Prisma.hrm_platform_departments_snapshotsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             name: true,
//             description: true,
//             color: true,
//             parent_department_id: true,
//             fiscal_start_month: true,
//             timezone: true,
//             status: true,
//             created_at: true,
//             updated_at: true,
//             hrm_platform_department_id: true,
//             ...
//           },
//         } satisfies Prisma.hrm_platform_departments_snapshotsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IHrmPlatformDepartmentsSnapshot> {
//         return {
//   id: {string},
//   department: {IHrmPlatformDepartment.ISummary},
//   name: {string},
//   description: {string | null},
//   color: {string | null},
//   parentDepartment: {IHrmPlatformDepartment.ISummary | null},
//   fiscalStartMonth: {integer | null},
//   timezone: {string | null},
//   status: {string},
//   createdAt: {string},
//   updatedAt: {string},
//         };
//       }
//     }
//--------------------------------------------------------------