import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace HrmPlatformDepartmentAtSummaryTransformer {
  export type Payload = Prisma.hrm_platform_departmentsGetPayload<
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
          },
        } satisfies Prisma.hrm_platform_departmentsFindManyArgs,
      },
    } satisfies Prisma.hrm_platform_departmentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
    cache: VariadicSingleton<
      Promise<IHrmPlatformDepartment.ISummary>,
      [string]
    > = createParentCache(),
  ): Promise<IHrmPlatformDepartment.ISummary> {
    return {
      id: input.id,
      name: input.name,
      description: input.description,
      created_at: input.created_at.toISOString(),
      parentDepartment: input.parentDepartment?.id
        ? await cache.get(input.parentDepartment.id)
        : null,
    } satisfies IHrmPlatformDepartment.ISummary;
  }
  export async function transformAll(
    inputs: Payload[],
  ): Promise<IHrmPlatformDepartment.ISummary[]> {
    const cache = createParentCache();
    return await ArrayUtil.asyncMap(inputs, (x) => transform(x, cache));
  }
  function createParentCache() {
    const cache = new VariadicSingleton(
      async (id: string): Promise<IHrmPlatformDepartment.ISummary> => {
        const record =
          await MyGlobal.prisma.hrm_platform_departments.findFirstOrThrow({
            ...select(),
            where: { id },
          });
        return transform(record, cache);
      },
    );
    return cache;
  }
}
