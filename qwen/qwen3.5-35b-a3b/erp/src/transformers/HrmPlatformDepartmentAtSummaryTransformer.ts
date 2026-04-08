import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmPlatformOrganizationAtSummaryTransformer } from "./HrmPlatformOrganizationAtSummaryTransformer";

export namespace HrmPlatformDepartmentAtSummaryTransformer {
  export type Payload = Prisma.hrm_platform_departmentsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        organization: HrmPlatformOrganizationAtSummaryTransformer.select(),
        parent_department_id: true,
        parentDepartment: undefined,
        childDepartments: undefined,
        snapshots: undefined,
        employees: undefined,
        employeeSnapshots: undefined,
      },
    } satisfies Prisma.hrm_platform_departmentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
    parentCache: VariadicSingleton<
      Promise<IHrmPlatformDepartment.ISummary>,
      [string]
    > = createParentCache(),
  ): Promise<IHrmPlatformDepartment.ISummary> {
    return {
      id: input.id,
      name: input.name,
      organization: await HrmPlatformOrganizationAtSummaryTransformer.transform(
        input.organization,
      ),
      parentDepartment: input.parent_department_id
        ? await parentCache.get(input.parent_department_id)
        : null,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
    };
  }
  export async function transformAll(
    inputs: Payload[],
  ): Promise<IHrmPlatformDepartment.ISummary[]> {
    const parentCache = createParentCache();
    return await ArrayUtil.asyncMap(inputs, (x) => transform(x, parentCache));
  }
  function createParentCache() {
    const cache = new VariadicSingleton<
      Promise<IHrmPlatformDepartment.ISummary>,
      [string]
    >(async (id: string): Promise<IHrmPlatformDepartment.ISummary> => {
      const record =
        await MyGlobal.prisma.hrm_platform_departments.findFirstOrThrow({
          ...select(),
          where: { id },
        });
      return transform(record, cache);
    });
    return cache;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace HrmPlatformDepartmentAtSummaryTransformer {
//       export type Payload = Prisma.hrm_platform_departmentsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             name: true,
//             created_at: true,
//             updated_at: true,
//             parentDepartment_id: true,
//             parentDepartment: undefined, // DO NOT select recursive relation
//             ...
//           },
//         } satisfies Prisma.hrm_platform_departmentsFindManyArgs;
//       }
// 
//       export async function transform(
//         input: Payload,
//         cache: VariadicSingleton<Promise<IHrmPlatformDepartment.ISummary>, [string]> = createParentCache(),
//       ): Promise<IHrmPlatformDepartment.ISummary> {
//         return {
//   id: {string},
//   name: {string},
//   organization: {IHrmPlatformOrganization.ISummary},
//   parentDepartment: input.parentDepartment_id ? await cache.get(input.parentDepartment_id) : null,
//   created_at: {string},
//   updated_at: {string},
//         };
//       }
// 
//       export async function transformAll(
//         inputs: Payload[],
//       ): Promise<IHrmPlatformDepartment.ISummary[]> {
//         const cache = createParentCache();
//         return await ArrayUtil.asyncMap(inputs, (x) => transform(x, cache));
//       }
// 
//       function createParentCache() {
//         const cache = new VariadicSingleton(
//           async (id: string): Promise<IHrmPlatformDepartment.ISummary> => {
//             const record =
//               await MyGlobal.prisma.hrm_platform_departments.findFirstOrThrow({
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