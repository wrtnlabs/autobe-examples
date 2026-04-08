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

export namespace HrmPlatformDepartmentsSnapshotAtSummaryTransformer {
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
    cache: VariadicSingleton<
      Promise<IHrmPlatformDepartmentsSnapshot.ISummary>,
      [string]
    > = createParentCache(),
  ): Promise<IHrmPlatformDepartmentsSnapshot.ISummary> {
    return {
      id: input.id ?? undefined,
      hrmPlatformDepartmentId: input.department.id ?? undefined,
      name: input.name ?? undefined,
      description: input.description ?? undefined,
      color: input.color ?? undefined,
      parentDepartment:
        input.parent_department_id != null
          ? await cache.get(input.parent_department_id)
          : undefined,
      fiscalStartMonth: input.fiscal_start_month ?? undefined,
      timezone: input.timezone ?? undefined,
      status: input.status ?? undefined,
      createdAt: input.created_at.toISOString() ?? undefined,
      updatedAt: input.updated_at.toISOString() ?? undefined,
      department:
        (await HrmPlatformDepartmentAtSummaryTransformer.transform(
          input.department,
        )) ?? undefined,
    } satisfies IHrmPlatformDepartmentsSnapshot.ISummary;
  }
  export async function transformAll(
    inputs: Payload[],
  ): Promise<IHrmPlatformDepartmentsSnapshot.ISummary[]> {
    const cache = createParentCache();
    return await ArrayUtil.asyncMap(inputs, (x) => transform(x, cache));
  }
  function createParentCache() {
    const cache = new VariadicSingleton<
      Promise<IHrmPlatformDepartmentsSnapshot.ISummary>,
      [string]
    >(async (id: string): Promise<IHrmPlatformDepartmentsSnapshot.ISummary> => {
      const record =
        await MyGlobal.prisma.hrm_platform_departments_snapshots.findFirstOrThrow(
          {
            ...select(),
            where: { id },
          },
        );
      return transform(record, cache);
    });
    return cache;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace HrmPlatformDepartmentsSnapshotAtSummaryTransformer {
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
//             parentDepartment_id: true,
//             parentDepartment: undefined, // DO NOT select recursive relation
//             ...
//           },
//         } satisfies Prisma.hrm_platform_departments_snapshotsFindManyArgs;
//       }
// 
//       export async function transform(
//         input: Payload,
//         cache: VariadicSingleton<Promise<IHrmPlatformDepartmentsSnapshot.ISummary>, [string]> = createParentCache(),
//       ): Promise<IHrmPlatformDepartmentsSnapshot.ISummary> {
//         return {
//   id: {string},
//   hrmPlatformDepartmentId: {string},
//   name: {string},
//   description: {string},
//   color: {string},
//   parentDepartment: input.parentDepartment_id ? await cache.get(input.parentDepartment_id) : null,
//   fiscalStartMonth: {integer},
//   timezone: {string},
//   status: {string},
//   createdAt: {string},
//   updatedAt: {string},
//   department: {IHrmPlatformDepartment.ISummary},
//         };
//       }
// 
//       export async function transformAll(
//         inputs: Payload[],
//       ): Promise<IHrmPlatformDepartmentsSnapshot.ISummary[]> {
//         const cache = createParentCache();
//         return await ArrayUtil.asyncMap(inputs, (x) => transform(x, cache));
//       }
// 
//       function createParentCache() {
//         const cache = new VariadicSingleton(
//           async (id: string): Promise<IHrmPlatformDepartmentsSnapshot.ISummary> => {
//             const record =
//               await MyGlobal.prisma.hrm_platform_departments_snapshots.findFirstOrThrow({
//                 ...select(),
//                 where: { id },
//               });
//             return transform(record, cache);
//           },
//         );
//         return cache;
//       }
//     }
//--------------------------------------------------------------