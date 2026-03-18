import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmTimeTrackingDepartmentAtSummaryTransformer } from "./HrmTimeTrackingDepartmentAtSummaryTransformer";
import { HrmTimeTrackingOrganizationAtSummaryTransformer } from "./HrmTimeTrackingOrganizationAtSummaryTransformer";

export namespace HrmTimeTrackingDepartmentTransformer {
  export type Payload = Prisma.hrm_time_tracking_departmentsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        organization: HrmTimeTrackingOrganizationAtSummaryTransformer.select(),
        parent: HrmTimeTrackingDepartmentAtSummaryTransformer.select(),
        name: true,
        description: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    } satisfies Prisma.hrm_time_tracking_departmentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmTimeTrackingDepartment> {
    return {
      id: input.id,
      organization:
        await HrmTimeTrackingOrganizationAtSummaryTransformer.transform(
          input.organization,
        ),
      parent: input.parent
        ? await HrmTimeTrackingDepartmentAtSummaryTransformer.transform(
            input.parent,
          )
        : null,
      name: input.name,
      description: input.description ?? null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at ? true : null,
    };
  }
}
