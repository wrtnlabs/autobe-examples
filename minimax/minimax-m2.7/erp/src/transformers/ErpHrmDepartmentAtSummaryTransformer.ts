import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ErpHrmDepartmentAtSummaryTransformer {
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
        parent: {
          select: {
            id: true,
          },
        } satisfies Prisma.erp_hrm_departmentsFindFirstOrThrowArgs,
        employees: undefined,
        children: undefined,
        invitations: undefined,
      },
    } satisfies Prisma.erp_hrm_departmentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
    cache: VariadicSingleton<
      Promise<IErpHrmDepartment.ISummary>,
      [string]
    > = createParentCache(),
  ): Promise<IErpHrmDepartment.ISummary> {
    return {
      id: input.id,
      name: input.name,
      description: input.description ?? undefined,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      parent: input.parent ? await cache.get(input.parent.id) : null,
    } satisfies IErpHrmDepartment.ISummary;
  }
  export async function transformAll(
    inputs: Payload[],
  ): Promise<IErpHrmDepartment.ISummary[]> {
    const cache = createParentCache();
    return await ArrayUtil.asyncMap(inputs, (x) => transform(x, cache));
  }
  function createParentCache() {
    const cache = new VariadicSingleton(
      async (id: string): Promise<IErpHrmDepartment.ISummary> => {
        const record =
          await MyGlobal.prisma.erp_hrm_departments.findFirstOrThrow({
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
//     export namespace ErpHrmDepartmentAtSummaryTransformer {
//       export type Payload = Prisma.erp_hrm_departmentsGetPayload<ReturnType<typeof select>>;
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
//             erp_hrm_organization_id: true,
//             parent_id: true,
//             parent: undefined, // DO NOT select recursive relation
//           },
//         } satisfies Prisma.erp_hrm_departmentsFindManyArgs;
//       }
// 
//       export async function transform(
//         input: Payload,
//         cache: VariadicSingleton<Promise<IErpHrmDepartment.ISummary>, [string]> = createParentCache(),
//       ): Promise<IErpHrmDepartment.ISummary> {
//         return {
//   id: {string},
//   name: {string},
//   description: {string | null},
//   created_at: {string},
//   updated_at: {string},
//   parent: input.parent_id ? await cache.get(input.parent_id) : null,
//         };
//       }
// 
//       export async function transformAll(
//         inputs: Payload[],
//       ): Promise<IErpHrmDepartment.ISummary[]> {
//         const cache = createParentCache();
//         return await ArrayUtil.asyncMap(inputs, (x) => transform(x, cache));
//       }
// 
//       function createParentCache() {
//         const cache = new VariadicSingleton(
//           async (id: string): Promise<IErpHrmDepartment.ISummary> => {
//             const record =
//               await MyGlobal.prisma.erp_hrm_departments.findFirstOrThrow({
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