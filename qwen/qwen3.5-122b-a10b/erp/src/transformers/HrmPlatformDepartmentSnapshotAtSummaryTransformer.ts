import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartmentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartmentSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace HrmPlatformDepartmentSnapshotAtSummaryTransformer {
  export type Payload = Prisma.hrm_platform_department_snapshotsGetPayload<
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
        department: {
          select: {
            id: true,
          },
        },
        parentDepartment: {
          select: {
            id: true,
          },
        },
      },
    } satisfies Prisma.hrm_platform_department_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmPlatformDepartmentSnapshot.ISummary> {
    return {
      id: input.id,
      hrm_platform_department_id: input.department.id,
      parent_department_id: input.parentDepartment?.id ?? null,
      name: input.name,
      description: input.description ?? null,
      created_at: input.created_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
}
