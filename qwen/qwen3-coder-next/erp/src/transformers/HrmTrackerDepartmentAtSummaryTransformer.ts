import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTrackerDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerDepartment";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace HrmTrackerDepartmentAtSummaryTransformer {
  export type Payload = Prisma.hrm_tracker_departmentsGetPayload<
    ReturnType<typeof select>
  >;
  export function select(): Prisma.hrm_tracker_departmentsFindManyArgs {
    return {
      select: {
        id: true,
        name: true,
        description: true,
        parent_id: true,
        organization: {
          select: { id: true },
        },
        parent: {
          select: {
            id: true,
            name: true,
            description: true,
            parent_id: true,
            organization: {
              select: { id: true },
            },
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        },
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    } satisfies Prisma.hrm_tracker_departmentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmTrackerDepartment.ISummary> {
    return {
      id: input.id,
      name: input.name,
      description: input.description ?? undefined,
      parent: (input as any).parent
        ? await transform((input as any).parent)
        : null,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
    };
  }
}
