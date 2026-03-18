import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmsDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsDepartment";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace HrmsDepartmentAtSummaryTransformer {
  export type Payload = Prisma.hrms_departmentsGetPayload<
    ReturnType<typeof select>
  >;
  export function select(): Prisma.hrms_departmentsFindManyArgs {
    return {
      select: {
        id: true,
        name: true,
        description: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        organization: true,
        employees: true,
        children: true,
      },
    } satisfies Prisma.hrms_departmentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmsDepartment.ISummary> {
    return {
      id: input.id,
      name: input.name,
      description: input.description,
      parent: null,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
      organization_id: input.organization_id,
    } satisfies IHrmsDepartment.ISummary;
  }
}
