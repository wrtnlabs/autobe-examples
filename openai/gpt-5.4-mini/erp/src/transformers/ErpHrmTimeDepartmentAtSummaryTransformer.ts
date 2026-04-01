import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import { IErpHrmTimeOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganization";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ErpHrmTimeDepartmentAtSummaryTransformer {
  export type Payload = Prisma.erp_hrm_time_departmentsGetPayload<
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
        erp_hrm_time_organization_id: true,
        parent_department_id: true,
        organization: {
          select: {
            id: true,
          },
        },
        employees: { select: { id: true } },
        childDepartments: { select: { id: true } },
      },
    } satisfies Prisma.erp_hrm_time_departmentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
    cache: VariadicSingleton<
      Promise<IErpHrmTimeDepartment.ISummary>,
      [string]
    > = createCache(),
  ): Promise<IErpHrmTimeDepartment.ISummary> {
    return {
      id: input.id,
      name: input.name,
      description: input.description ?? null,
      organization: {
        id: input.organization.id,
      } as IErpHrmTimeOrganization.ISummary,
      parentDepartment: input.parent_department_id
        ? await cache.get(input.parent_department_id)
        : null,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
    };
  }
  export async function transformAll(
    inputs: Payload[],
  ): Promise<IErpHrmTimeDepartment.ISummary[]> {
    const cache = createCache();
    return await ArrayUtil.asyncMap(inputs, (x) => transform(x, cache));
  }
  function createCache() {
    const cache = new VariadicSingleton(
      async (id: string): Promise<IErpHrmTimeDepartment.ISummary> => {
        const record =
          await MyGlobal.prisma.erp_hrm_time_departments.findFirstOrThrow({
            ...select(),
            where: { id },
          });
        return transform(record, cache);
      },
    );
    return cache;
  }
}
