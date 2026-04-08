import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import { IErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationDashboardSummary";
import { IErpHrmTimeProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeProject";
import { IErpHrmTimeTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTask";
import { IErpHrmTimeTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTimelog";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ErpHrmTimeProjectAtSummaryTransformer } from "./ErpHrmTimeProjectAtSummaryTransformer";

export namespace ErpHrmTimeTimelogTransformer {
  export type Payload = Prisma.erp_hrm_time_timelogsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        work_date: true,
        duration_minutes: true,
        description: true,
        billable: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        member: {
          select: {
            id: true,
          },
        },
        project: ErpHrmTimeProjectAtSummaryTransformer.select(),
        task: {
          select: {
            id: true,
          },
        },
        timesheetTimelogs: {
          select: {
            id: true,
          },
        },
      },
    } satisfies Prisma.erp_hrm_time_timelogsFindManyArgs;
  }
  export async function transform(input: Payload): Promise<IErpHrmTimeTimelog> {
    return {
      id: input.id,
      member: {
        id: input.member.id,
      } as IErpHrmTimeMember.ISummary,
      project: await ErpHrmTimeProjectAtSummaryTransformer.transform(
        input.project,
      ),
      task:
        input.task === null
          ? null
          : ({ id: input.task.id } as IErpHrmTimeTask.ISummary),
      workDate: input.work_date.toISOString(),
      durationMinutes: input.duration_minutes,
      description: input.description,
      billable: input.billable,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
    };
  }
}
