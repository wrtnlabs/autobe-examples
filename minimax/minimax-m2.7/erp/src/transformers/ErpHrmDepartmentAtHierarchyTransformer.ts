import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ErpHrmDepartmentAtSummaryTransformer } from "./ErpHrmDepartmentAtSummaryTransformer";

export namespace ErpHrmDepartmentAtHierarchyTransformer {
  export type Payload = Prisma.erp_hrm_departmentsGetPayload<
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
        organization: undefined,
        parent: ErpHrmDepartmentAtSummaryTransformer.select(),
        children: undefined,
        employees: undefined,
        invitations: undefined,
      },
    } satisfies Prisma.erp_hrm_departmentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
    childrenCache: VariadicSingleton<
      Promise<IErpHrmDepartment.IHierarchy[]>,
      [string]
    > = createChildrenCache(),
  ): Promise<IErpHrmDepartment.IHierarchy> {
    return {
      id: input.id,
      name: input.name,
      description: input.description ?? undefined,
      parent: await getParent(input.parent),
      children: await childrenCache.get(input.id),
    } satisfies IErpHrmDepartment.IHierarchy;
  }
  export async function transformAll(
    inputs: Payload[],
  ): Promise<IErpHrmDepartment.IHierarchy[]> {
    const childrenCache = createChildrenCache();
    return await ArrayUtil.asyncMap(inputs, (x) => transform(x, childrenCache));
  }
  function createChildrenCache() {
    const childrenCache = new VariadicSingleton<
      Promise<IErpHrmDepartment.IHierarchy[]>,
      [string]
    >(async (parentId: string): Promise<IErpHrmDepartment.IHierarchy[]> => {
      const records = await MyGlobal.prisma.erp_hrm_departments.findMany({
        ...select(),
        where: { parent_id: parentId },
      });
      return await ArrayUtil.asyncMap(records, (r) =>
        transform(r, childrenCache),
      );
    });
    return childrenCache;
  }
  async function getParent(
    parent: Payload["parent"],
  ): Promise<IErpHrmDepartment.ISummary | null> {
    if (parent === null) return null;
    return ErpHrmDepartmentAtSummaryTransformer.transform(parent);
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ErpHrmDepartmentAtHierarchyTransformer {
//       export type Payload = Prisma.erp_hrm_departmentsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             name: true,
//             description: true,
//             children: undefined, // DO NOT select recursive relation
//             ...
//           },
//         } satisfies Prisma.erp_hrm_departmentsFindManyArgs;
//       }
// 
//       export async function transform(
//         input: Payload,
//         cache: VariadicSingleton<Promise<IErpHrmDepartment.IHierarchy[]>, [string]> = createChildrenCache(),
//       ): Promise<IErpHrmDepartment.IHierarchy> {
//         return {
//   id: {string},
//   name: {string},
//   description: {string | null},
//   parent: {IErpHrmDepartment.ISummary | null},
//   children: await cache.get(input.id),
//         };
//       }
// 
//       export async function transformAll(
//         inputs: Payload[],
//       ): Promise<IErpHrmDepartment.IHierarchy[]> {
//         const cache = createChildrenCache();
//         return await ArrayUtil.asyncMap(inputs, (x) => transform(x, cache));
//       }
// 
//       function createChildrenCache() {
//         const cache = new VariadicSingleton(
//           async (parentId: string): Promise<IErpHrmDepartment.IHierarchy[]> => {
//             const records =
//               await MyGlobal.prisma.erp_hrm_departments.findMany({
//                 ...select(),
//                 where: { parent_id: parentId },
//               });
//             return await ArrayUtil.asyncMap(records, (r) => transform(r, cache));
//           },
//         );
//         return cache;
//       }
//     }
//--------------------------------------------------------------