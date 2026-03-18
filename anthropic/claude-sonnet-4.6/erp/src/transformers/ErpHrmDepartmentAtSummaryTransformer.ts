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
        updated_at: true,
        parent: {
          select: {
            id: true,
            name: true,
            description: true,
            created_at: true,
            updated_at: true,
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
      description: input.description ?? null,
      parent: input.parent
        ? ({
            id: input.parent.id,
            name: input.parent.name,
            description: input.parent.description ?? null,
            parent: null,
            created_at: input.parent.created_at.toISOString(),
            updated_at: input.parent.updated_at.toISOString(),
          } satisfies IErpHrmDepartment.ISummary)
        : null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    };
  }
}
