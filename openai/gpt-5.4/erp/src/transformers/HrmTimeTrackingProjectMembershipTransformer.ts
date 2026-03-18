import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import { IHrmTimeTrackingProjectMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProjectMembership";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmTimeTrackingEmployeeAtSummaryTransformer } from "./HrmTimeTrackingEmployeeAtSummaryTransformer";
import { HrmTimeTrackingProjectAtSummaryTransformer } from "./HrmTimeTrackingProjectAtSummaryTransformer";

export namespace HrmTimeTrackingProjectMembershipTransformer {
  export async function transform(
    input: Payload,
  ): Promise<IHrmTimeTrackingProjectMembership> {
    return {
      id: input.id,
      membership_role: input.membership_role,
      project: await HrmTimeTrackingProjectAtSummaryTransformer.transform(
        input.project,
      ),
      employee: await HrmTimeTrackingEmployeeAtSummaryTransformer.transform(
        input.employee,
      ),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
  export function select() {
    return {
      select: {
        id: true,
        membership_role: true,
        project: HrmTimeTrackingProjectAtSummaryTransformer.select(),
        employee: HrmTimeTrackingEmployeeAtSummaryTransformer.select(),
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    } satisfies Prisma.hrm_time_tracking_project_membershipsFindManyArgs;
  }
  export type Payload = Prisma.hrm_time_tracking_project_membershipsGetPayload<
    ReturnType<typeof select>
  >;
}
