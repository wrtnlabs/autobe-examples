import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace HrmTimeTrackingDepartmentAtSummaryTransformer {
  export type Payload = Prisma.hrm_time_tracking_departmentsGetPayload<
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
        hrm_time_tracking_organization_id: true,
        parent_id: true,
        parent: undefined,
        _count: {
          select: {
            children: {
              where: {
                deleted_at: null,
              },
            },
          },
        },
      },
    } satisfies Prisma.hrm_time_tracking_departmentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
    cache: VariadicSingleton<
      Promise<IHrmTimeTrackingDepartment.ISummary>,
      [string]
    > = createParentCache(),
  ): Promise<IHrmTimeTrackingDepartment.ISummary> {
    return {
      id: input.id,
      name: input.name,
      description: input.description,
      parent:
        input.parent_id !== null ? await cache.get(input.parent_id) : null,
      children_count: input._count.children,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    } satisfies IHrmTimeTrackingDepartment.ISummary;
  }
  export async function transformAll(
    inputs: Payload[],
  ): Promise<IHrmTimeTrackingDepartment.ISummary[]> {
    const cache = createParentCache();
    return await ArrayUtil.asyncMap(inputs, (x) => transform(x, cache));
  }
  function createParentCache(): VariadicSingleton<
    Promise<IHrmTimeTrackingDepartment.ISummary>,
    [string]
  > {
    const cache = new VariadicSingleton(
      async (id: string): Promise<IHrmTimeTrackingDepartment.ISummary> => {
        const record =
          await MyGlobal.prisma.hrm_time_tracking_departments.findFirstOrThrow({
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
//     export namespace HrmTimeTrackingDepartmentAtSummaryTransformer {
//       export type Payload = Prisma.hrm_time_tracking_departmentsGetPayload<ReturnType<typeof select>>;
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
//             hrm_time_tracking_organization_id: true,
//             parent_id: true,
//             parent: undefined, // DO NOT select recursive relation
//           },
//         } satisfies Prisma.hrm_time_tracking_departmentsFindManyArgs;
//       }
// 
//       export async function transform(
//         input: Payload,
//         cache: VariadicSingleton<Promise<IHrmTimeTrackingDepartment.ISummary>, [string]> = createParentCache(),
//       ): Promise<IHrmTimeTrackingDepartment.ISummary> {
//         return {
//   id: {string},
//   name: {string},
//   description: {string | null},
//   parent: input.parent_id ? await cache.get(input.parent_id) : null,
//   children_count: {integer},
//   created_at: {string},
//   updated_at: {string},
//         };
//       }
// 
//       export async function transformAll(
//         inputs: Payload[],
//       ): Promise<IHrmTimeTrackingDepartment.ISummary[]> {
//         const cache = createParentCache();
//         return await ArrayUtil.asyncMap(inputs, (x) => transform(x, cache));
//       }
// 
//       function createParentCache() {
//         const cache = new VariadicSingleton(
//           async (id: string): Promise<IHrmTimeTrackingDepartment.ISummary> => {
//             const record =
//               await MyGlobal.prisma.hrm_time_tracking_departments.findFirstOrThrow({
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