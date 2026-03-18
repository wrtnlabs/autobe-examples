import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

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
        parentDepartment: {
          select: {
            id: true,
            name: true,
            description: true,
            created_at: true,
            _count: {
              select: {
                children: true,
              },
            },
          },
        },
        _count: {
          select: {
            children: true,
          },
        },
      },
    } satisfies Prisma.erp_hrm_departmentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IErpHrmDepartment.ISummary> {
    return {
      id: input.id,
      name: input.name,
      description: input.description,
      parentDepartment: input.parentDepartment
        ? ({
            id: input.parentDepartment.id,
            name: input.parentDepartment.name,
            description: input.parentDepartment.description,
            parentDepartment: null,
            childDepartmentCount: input.parentDepartment._count.children,
            createdAt: toISOStringSafe(input.parentDepartment.created_at),
          } satisfies IErpHrmDepartment.ISummary)
        : null,
      childDepartmentCount: input._count.children,
      createdAt: toISOStringSafe(input.created_at),
    };
  }
}
