import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTrackerDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerDepartment";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmTrackerDepartmentAtSummaryTransformer } from "./HrmTrackerDepartmentAtSummaryTransformer";

export namespace HrmTrackerDepartmentTransformer {
  export type Payload = Prisma.hrm_tracker_departmentsGetPayload<
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
        organization: true,
        parent: HrmTrackerDepartmentAtSummaryTransformer.select(),
        children: {
          select: { id: true },
        } satisfies Prisma.hrm_tracker_departmentsFindManyArgs,
        employees: true,
        employeeHistories: true,
      },
    } satisfies Prisma.hrm_tracker_departmentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmTrackerDepartment> {
    return {
      id: input.id,
      name: input.name,
      description: input.description ?? null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
      parent: input.parent
        ? await HrmTrackerDepartmentAtSummaryTransformer.transform(input.parent)
        : null,
      children_count: input.children.length,
    };
  }
}
