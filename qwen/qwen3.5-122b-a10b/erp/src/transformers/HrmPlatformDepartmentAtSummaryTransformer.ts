import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace HrmPlatformDepartmentAtSummaryTransformer {
  export type Payload = Prisma.hrm_platform_departmentsGetPayload<
    ReturnType<typeof select>
  >;
  export function select(): Prisma.hrm_platform_departmentsFindManyArgs {
    return {
      select: {
        id: true,
        name: true,
        description: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    };
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmPlatformDepartment.ISummary> {
    return {
      id: input.id,
      name: input.name,
      description: input.description ?? undefined,
      parent_department: null,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
    };
  }
}
