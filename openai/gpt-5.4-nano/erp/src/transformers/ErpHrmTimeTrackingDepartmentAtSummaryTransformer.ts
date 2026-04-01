import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingDepartment";
import { IErpHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingOrganization";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ErpHrmTimeTrackingDepartmentAtSummaryTransformer {
  export type Payload = Prisma.erp_hrm_time_tracking_departmentsGetPayload<
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
        organization: {
          select: {
            // IErpHrmTimeTrackingOrganization.ISummary is an empty object DTO,
            // so selecting no fields is acceptable.
          },
        },
        parentDepartment: {
          select: {
            id: true,
          },
        },
        childDepartments: {
          select: {
            id: true,
          },
        },
      },
    } satisfies Prisma.erp_hrm_time_tracking_departmentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IErpHrmTimeTrackingDepartment.ISummary> {
    return {
      id: input.id,
      organization: {},
      parent_department_id: input.parentDepartment?.id ?? null,
      name: input.name,
      description: input.description ?? null,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
    };
  }
}
