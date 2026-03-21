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
        parent: true,
      },
    } satisfies Prisma.erp_hrm_departmentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IErpHrmDepartment.ISummary> {
    return {
      created_at: input.created_at.toISOString(),
      description: input.description ?? undefined,
      id: input.id,
      name: input.name,
      parent: input.parent
        ? {
            created_at: input.parent.created_at.toISOString(),
            description: input.parent.description ?? undefined,
            id: input.parent.id,
            name: input.parent.name,
            parent: undefined,
            updated_at: input.parent.updated_at.toISOString(),
          }
        : undefined,
      updated_at: input.updated_at.toISOString(),
    };
  }
}
