import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingDepartment";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ErpHrmTimeTrackingDepartmentAtInvertTransformer {
  export type Payload = Prisma.erp_hrm_time_tracking_departmentsGetPayload<
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
            // Intentionally do not select further nested children to keep the
            // recursive payload type uniform and avoid TS2345 payload mismatch.
          },
        },
      },
    } satisfies Prisma.erp_hrm_time_tracking_departmentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IErpHrmTimeTrackingDepartment.IInvert> {
    return {
      id: input.id,
      name: input.name,
      description: input.description ?? null,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
      children: await ArrayUtil.asyncMap(
        input.childDepartments,
        async (child) => {
          return {
            id: child.id,
            name: child.name,
            description: child.description ?? null,
            created_at: toISOStringSafe(child.created_at),
            updated_at: toISOStringSafe(child.updated_at),
            deleted_at: child.deleted_at
              ? toISOStringSafe(child.deleted_at)
              : null,
            children: [],
          } satisfies IErpHrmTimeTrackingDepartment.IInvert;
        },
      ),
    };
  }
}
