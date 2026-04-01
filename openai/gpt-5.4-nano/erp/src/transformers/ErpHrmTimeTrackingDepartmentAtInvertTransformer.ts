import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingDepartment";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ErpHrmTimeTrackingDepartmentAtInvertTransformer {
  export type Payload = Prisma.erp_hrm_time_tracking_departmentsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    // Bounded recursion in the query (depth 3) to keep Prisma select finite.
    return {
      select: {
        id: true,
        name: true,
        description: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        organization: { select: { id: true } },
        parentDepartment: { select: { id: true } },
        childDepartments: {
          select: {
            id: true,
            name: true,
            description: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
            organization: { select: { id: true } },
            parentDepartment: { select: { id: true } },
            childDepartments: {
              select: {
                id: true,
                name: true,
                description: true,
                created_at: true,
                updated_at: true,
                deleted_at: true,
                organization: { select: { id: true } },
                parentDepartment: { select: { id: true } },
                childDepartments: {
                  select: {
                    id: true,
                    name: true,
                    description: true,
                    created_at: true,
                    updated_at: true,
                    deleted_at: true,
                    organization: { select: { id: true } },
                    parentDepartment: { select: { id: true } },
                    // depth 3 stops here (no further childDepartments selection)
                    childDepartments: { select: {} as never },
                  },
                },
              },
            },
          },
        },
      },
    } satisfies Prisma.erp_hrm_time_tracking_departmentsFindManyArgs;
  }
  function transformWithDepth(
    input: Payload,
    depthLeft: number,
  ): Promise<IErpHrmTimeTrackingDepartment.IInvert> {
    if (depthLeft <= 0) {
      return Promise.resolve({
        id: input.id,
        name: input.name,
        description: input.description ?? null,
        created_at: toISOStringSafe(input.created_at),
        updated_at: toISOStringSafe(input.updated_at),
        deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
        children: [],
      });
    }
    return ArrayUtil.asyncMap(input.childDepartments, (child) =>
      transformWithDepth(child, depthLeft - 1),
    ).then((children) => ({
      id: input.id,
      name: input.name,
      description: input.description ?? null,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
      children: children as IErpHrmTimeTrackingDepartment.IInvert[],
    }));
  }
  export async function transform(
    input: Payload,
  ): Promise<IErpHrmTimeTrackingDepartment.IInvert> {
    return transformWithDepth(input, 3);
  }
}
