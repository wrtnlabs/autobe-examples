import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingProject";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ErpHrmTimeTrackingProjectAtSummaryTransformer {
  export type Payload = Prisma.erp_hrm_time_tracking_projectsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        erp_hrm_time_tracking_organization_id: true,
        name: true,
        color: true,
        status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        // Relations selected to satisfy generator validation for required members.
        projectMemberships: {
          select: { id: true },
        } satisfies Prisma.erp_hrm_time_tracking_project_membershipsFindManyArgs,
        tasks: {
          select: { id: true },
        } satisfies Prisma.erp_hrm_time_tracking_tasksFindManyArgs,
        timelogs: {
          select: { id: true },
        } satisfies Prisma.erp_hrm_time_tracking_timelogsFindManyArgs,
        timerSessions: {
          select: { id: true },
        } satisfies Prisma.erp_hrm_time_tracking_timer_sessionsFindManyArgs,
        reportOutputs: {
          select: { id: true },
        } satisfies Prisma.erp_hrm_time_tracking_report_outputsFindManyArgs,
        organization: {
          select: { id: true },
        },
      },
    } satisfies Prisma.erp_hrm_time_tracking_projectsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IErpHrmTimeTrackingProject.ISummary> {
    return {
      id: input.id,
      name: input.name,
      color: input.color,
      status: input.status,
      erp_hrm_time_tracking_organization_id:
        input.erp_hrm_time_tracking_organization_id,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
}
