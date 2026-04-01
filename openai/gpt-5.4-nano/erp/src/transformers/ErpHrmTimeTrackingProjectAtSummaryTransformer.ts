import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingProject";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ErpHrmTimeTrackingProjectAtSummaryTransformer {
  export type Payload = Prisma.erp_hrm_time_tracking_projectsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        color: true,
        status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        organization: {
          select: {
            id: true,
          },
        },
        // Generator-required relations for payload completeness.
        projectMemberships: {
          select: {
            id: true,
          },
        },
        tasks: {
          select: {
            id: true,
          },
        },
        timelogs: {
          select: {
            id: true,
          },
        },
        timerSessions: {
          select: {
            id: true,
          },
        },
        reportOutputs: {
          select: {
            id: true,
          },
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
      erp_hrm_time_tracking_organization_id: input.organization.id,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
}
