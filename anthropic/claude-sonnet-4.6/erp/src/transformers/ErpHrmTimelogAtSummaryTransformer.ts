import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationMember";
import { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IErpHrmRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRolePermission";
import { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ErpHrmOrganizationMemberAtSummaryTransformer } from "./ErpHrmOrganizationMemberAtSummaryTransformer";
import { ErpHrmProjectAtSummaryTransformer } from "./ErpHrmProjectAtSummaryTransformer";
import { ErpHrmTaskAtSummaryTransformer } from "./ErpHrmTaskAtSummaryTransformer";

export namespace ErpHrmTimelogAtSummaryTransformer {
  export type Payload = Prisma.erp_hrm_timelogsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        timesheet_id: true,
        work_date: true,
        duration_minutes: true,
        billable: true,
        description: true,
        created_at: true,
        updated_at: true,
        organizationMember:
          ErpHrmOrganizationMemberAtSummaryTransformer.select(),
        project: ErpHrmProjectAtSummaryTransformer.select(),
        task: ErpHrmTaskAtSummaryTransformer.select(),
      },
    } satisfies Prisma.erp_hrm_timelogsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IErpHrmTimelog.ISummary> {
    return {
      id: input.id,
      organizationMember:
        await ErpHrmOrganizationMemberAtSummaryTransformer.transform(
          input.organizationMember,
        ),
      project: await ErpHrmProjectAtSummaryTransformer.transform(input.project),
      task:
        input.task !== null
          ? await ErpHrmTaskAtSummaryTransformer.transform(input.task)
          : null,
      timesheetId: input.timesheet_id,
      workDate: input.work_date.toISOString(),
      durationMinutes: input.duration_minutes,
      billable: input.billable,
      description: input.description,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
    };
  }
}
