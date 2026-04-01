import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingMember";
import { IErpHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingProject";
import { IErpHrmTimeTrackingProjectMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingProjectMembership";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ErpHrmTimeTrackingMemberAtSummaryTransformer } from "./ErpHrmTimeTrackingMemberAtSummaryTransformer";
import { ErpHrmTimeTrackingProjectAtSummaryTransformer } from "./ErpHrmTimeTrackingProjectAtSummaryTransformer";

export namespace ErpHrmTimeTrackingProjectMembershipTransformer {
  export type Payload =
    Prisma.erp_hrm_time_tracking_project_membershipsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        membership_role: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        project: ErpHrmTimeTrackingProjectAtSummaryTransformer.select(),
        employee: ErpHrmTimeTrackingMemberAtSummaryTransformer.select(),
      },
    } satisfies Prisma.erp_hrm_time_tracking_project_membershipsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IErpHrmTimeTrackingProjectMembership> {
    return {
      id: input.id,
      project: await ErpHrmTimeTrackingProjectAtSummaryTransformer.transform(
        input.project,
      ),
      project_id: input.project.id,
      employee: await ErpHrmTimeTrackingMemberAtSummaryTransformer.transform(
        input.employee,
      ),
      employee_id: input.employee.id,
      membership_role: input.membership_role,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at ? input.deleted_at.toISOString() : null,
    };
  }
}
