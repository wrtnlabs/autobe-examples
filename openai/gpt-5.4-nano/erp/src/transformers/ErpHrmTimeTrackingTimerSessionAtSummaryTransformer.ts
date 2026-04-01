import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingMember";
import { IErpHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingOrganization";
import { IErpHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingProject";
import { IErpHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingTask";
import { IErpHrmTimeTrackingTimerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingTimerSession";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ErpHrmTimeTrackingMemberAtSummaryTransformer } from "./ErpHrmTimeTrackingMemberAtSummaryTransformer";
import { ErpHrmTimeTrackingProjectAtSummaryTransformer } from "./ErpHrmTimeTrackingProjectAtSummaryTransformer";
import { ErpHrmTimeTrackingTaskAtSummaryTransformer } from "./ErpHrmTimeTrackingTaskAtSummaryTransformer";

export namespace ErpHrmTimeTrackingTimerSessionAtSummaryTransformer {
  export type Payload = Prisma.erp_hrm_time_tracking_timer_sessionsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        description: true,
        started_at: true,
        ended_at: true,
        is_active: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        organization: {
          select: {},
        },
        employee: ErpHrmTimeTrackingMemberAtSummaryTransformer.select(),
        project: ErpHrmTimeTrackingProjectAtSummaryTransformer.select(),
        task: ErpHrmTimeTrackingTaskAtSummaryTransformer.select(),
      },
    } satisfies Prisma.erp_hrm_time_tracking_timer_sessionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IErpHrmTimeTrackingTimerSession.ISummary> {
    return {
      id: input.id,
      description: input.description,
      started_at: input.started_at.toISOString(),
      ended_at: input.ended_at?.toISOString() ?? null,
      is_active: input.is_active,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
      organization: {},
      member: await ErpHrmTimeTrackingMemberAtSummaryTransformer.transform(
        input.employee,
      ),
      project: await ErpHrmTimeTrackingProjectAtSummaryTransformer.transform(
        input.project,
      ),
      task: input.task
        ? await ErpHrmTimeTrackingTaskAtSummaryTransformer.transform(input.task)
        : null,
    };
  }
}
