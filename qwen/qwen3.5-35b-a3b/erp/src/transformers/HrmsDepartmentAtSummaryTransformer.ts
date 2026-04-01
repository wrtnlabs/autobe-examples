import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmsDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsDepartment";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace HrmsDepartmentAtSummaryTransformer {
  export type Payload = Prisma.hrms_departmentsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        organization: {
          select: { id: true },
        } satisfies Prisma.hrms_organizationsFindManyArgs,
        parent_id: true,
        name: true,
        description: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        employees: {
          select: { id: true },
        } satisfies Prisma.hrms_employeesFindManyArgs,
        children: {
          select: { id: true },
        } satisfies Prisma.hrms_departmentsFindManyArgs,
      },
    } satisfies Prisma.hrms_departmentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
    cache: VariadicSingleton<
      Promise<IHrmsDepartment.ISummary>,
      [string]
    > = createCache(),
  ): Promise<IHrmsDepartment.ISummary> {
    return {
      id: input.id,
      organization_id: input.organization.id,
      parent: input.parent_id ? await cache.get(input.parent_id) : null,
      name: input.name,
      description: input.description ?? null,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
    } satisfies IHrmsDepartment.ISummary;
  }
  export async function transformAll(
    inputs: Payload[],
  ): Promise<IHrmsDepartment.ISummary[]> {
    const cache = createCache();
    return await ArrayUtil.asyncMap(inputs, (x) => transform(x, cache));
  }
  function createCache() {
    const cache = new VariadicSingleton(
      async (id: string): Promise<IHrmsDepartment.ISummary> => {
        const record = await MyGlobal.prisma.hrms_departments.findFirstOrThrow({
          ...select(),
          where: { id },
        });
        return transform(record, cache);
      },
    );
    return cache;
  }
}
