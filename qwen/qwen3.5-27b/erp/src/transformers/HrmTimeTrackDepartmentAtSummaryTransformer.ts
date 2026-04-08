import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackDepartment";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace HrmTimeTrackDepartmentAtSummaryTransformer {
  export type Payload = Prisma.hrm_time_track_departmentsGetPayload<
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
        parentDepartment: {
          select: { id: true },
        } satisfies Prisma.hrm_time_track_departmentsFindManyArgs,
        employees: undefined,
        employeeSnapshots: undefined,
        childDepartments: undefined,
        activityLogs: undefined,
      },
    } satisfies Prisma.hrm_time_track_departmentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
    cache: VariadicSingleton<
      Promise<IHrmTimeTrackDepartment.ISummary>,
      [string]
    > = createParentCache(),
  ): Promise<IHrmTimeTrackDepartment.ISummary> {
    return {
      id: input.id,
      name: input.name,
      description: input.description,
      parent: input.parentDepartment?.id
        ? await cache.get(input.parentDepartment.id)
        : null,
      created_at: input.created_at.toISOString(),
    };
  }
  export async function transformAll(
    inputs: Payload[],
  ): Promise<IHrmTimeTrackDepartment.ISummary[]> {
    const cache = createParentCache();
    return await ArrayUtil.asyncMap(inputs, (x) => transform(x, cache));
  }
  function createParentCache() {
    const cache = new VariadicSingleton(
      async (id: string): Promise<IHrmTimeTrackDepartment.ISummary> => {
        const record =
          await MyGlobal.prisma.hrm_time_track_departments.findFirstOrThrow({
            ...select(),
            where: { id },
          });
        return transform(record, cache);
      },
    );
    return cache;
  }
}
