import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmDepartment";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace HrmDepartmentAtSummaryTransformer {
  export type Payload = Prisma.hrm_departmentsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        description: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        organization_id: true,
        parent_department_id: true,
        parentDepartment: undefined,
      },
    } satisfies Prisma.hrm_departmentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
    cache: VariadicSingleton<
      Promise<IHrmDepartment.ISummary>,
      [string]
    > = createParentCache(),
  ): Promise<IHrmDepartment.ISummary> {
    return {
      id: input.id,
      name: input.name,
      description: input.description ?? null,
      parent_department: input.parent_department_id
        ? await cache.get(input.parent_department_id)
        : null,
      created_at: input.created_at.toISOString(),
    } satisfies IHrmDepartment.ISummary;
  }
  export async function transformAll(
    inputs: Payload[],
  ): Promise<IHrmDepartment.ISummary[]> {
    const cache = createParentCache();
    return await ArrayUtil.asyncMap(inputs, (x) => transform(x, cache));
  }
  function createParentCache(): VariadicSingleton<
    Promise<IHrmDepartment.ISummary>,
    [string]
  > {
    const cache = new VariadicSingleton(
      async (id: string): Promise<IHrmDepartment.ISummary> => {
        const record = await MyGlobal.prisma.hrm_departments.findFirstOrThrow({
          ...select(),
          where: { id },
        });
        return transform(record, cache);
      },
    );
    return cache;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace HrmDepartmentAtSummaryTransformer {
//       export type Payload = Prisma.hrm_departmentsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             name: true,
//             description: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             organization_id: true,
//             parent_department_id: true,
//             parentDepartment: undefined, // DO NOT select recursive relation
//           },
//         } satisfies Prisma.hrm_departmentsFindManyArgs;
//       }
// 
//       export async function transform(
//         input: Payload,
//         cache: VariadicSingleton<Promise<IHrmDepartment.ISummary>, [string]> = createParentCache(),
//       ): Promise<IHrmDepartment.ISummary> {
//         return {
//   id: {string},
//   name: {string},
//   description: {string | null},
//   parent_department: input.parent_department_id ? await cache.get(input.parent_department_id) : null,
//   created_at: {string},
//         };
//       }
// 
//       export async function transformAll(
//         inputs: Payload[],
//       ): Promise<IHrmDepartment.ISummary[]> {
//         const cache = createParentCache();
//         return await ArrayUtil.asyncMap(inputs, (x) => transform(x, cache));
//       }
// 
//       function createParentCache() {
//         const cache = new VariadicSingleton(
//           async (id: string): Promise<IHrmDepartment.ISummary> => {
//             const record =
//               await MyGlobal.prisma.hrm_departments.findFirstOrThrow({
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