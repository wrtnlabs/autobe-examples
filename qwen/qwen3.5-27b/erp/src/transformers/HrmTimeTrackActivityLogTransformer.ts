import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackActivityLog";
import { IHrmTimeTrackDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackDepartment";
import { IHrmTimeTrackEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackEmployee";
import { IHrmTimeTrackEmployeeContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackEmployeeContract";
import { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import { IHrmTimeTrackOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackOrganization";
import { IHrmTimeTrackProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackProject";
import { IHrmTimeTrackRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackRole";
import { IHrmTimeTrackTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackTask";
import { IHrmTimeTrackTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackTimesheet";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmTimeTrackDepartmentAtSummaryTransformer } from "./HrmTimeTrackDepartmentAtSummaryTransformer";
import { HrmTimeTrackEmployeeAtSummaryTransformer } from "./HrmTimeTrackEmployeeAtSummaryTransformer";
import { HrmTimeTrackEmployeeContractAtSummaryTransformer } from "./HrmTimeTrackEmployeeContractAtSummaryTransformer";
import { HrmTimeTrackMemberAtSummaryTransformer } from "./HrmTimeTrackMemberAtSummaryTransformer";
import { HrmTimeTrackOrganizationAtSummaryTransformer } from "./HrmTimeTrackOrganizationAtSummaryTransformer";
import { HrmTimeTrackProjectAtSummaryTransformer } from "./HrmTimeTrackProjectAtSummaryTransformer";
import { HrmTimeTrackRoleAtSummaryTransformer } from "./HrmTimeTrackRoleAtSummaryTransformer";
import { HrmTimeTrackTaskAtSummaryTransformer } from "./HrmTimeTrackTaskAtSummaryTransformer";
import { HrmTimeTrackTimesheetAtSummaryTransformer } from "./HrmTimeTrackTimesheetAtSummaryTransformer";

export namespace HrmTimeTrackActivityLogTransformer {
  export type Payload = Prisma.hrm_time_track_activity_logsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        activity_type: true,
        description: true,
        metadata: true,
        ip_address: true,
        user_agent: true,
        created_at: true,
        organization: HrmTimeTrackOrganizationAtSummaryTransformer.select(),
        member: HrmTimeTrackMemberAtSummaryTransformer.select(),
        employee: HrmTimeTrackEmployeeAtSummaryTransformer.select(),
        project: HrmTimeTrackProjectAtSummaryTransformer.select(),
        task: HrmTimeTrackTaskAtSummaryTransformer.select(),
        timesheet: HrmTimeTrackTimesheetAtSummaryTransformer.select(),
        role: HrmTimeTrackRoleAtSummaryTransformer.select(),
        employeeContract:
          HrmTimeTrackEmployeeContractAtSummaryTransformer.select(),
        department: HrmTimeTrackDepartmentAtSummaryTransformer.select(),
      },
    } satisfies Prisma.hrm_time_track_activity_logsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmTimeTrackActivityLog> {
    return {
      id: input.id,
      activity_type: input.activity_type,
      description: input.description,
      metadata: input.metadata ?? undefined,
      ip_address: input.ip_address ?? undefined,
      user_agent: input.user_agent ?? undefined,
      created_at: toISOStringSafe(input.created_at),
      organization:
        await HrmTimeTrackOrganizationAtSummaryTransformer.transform(
          input.organization,
        ),
      member: await HrmTimeTrackMemberAtSummaryTransformer.transform(
        input.member,
      ),
      employee: input.employee
        ? await HrmTimeTrackEmployeeAtSummaryTransformer.transform(
            input.employee,
          )
        : null,
      project: input.project
        ? await HrmTimeTrackProjectAtSummaryTransformer.transform(input.project)
        : null,
      task: input.task
        ? await HrmTimeTrackTaskAtSummaryTransformer.transform(input.task)
        : null,
      timesheet: input.timesheet
        ? await HrmTimeTrackTimesheetAtSummaryTransformer.transform(
            input.timesheet,
          )
        : null,
      role: input.role
        ? await HrmTimeTrackRoleAtSummaryTransformer.transform(input.role)
        : null,
      employeeContract: input.employeeContract
        ? await HrmTimeTrackEmployeeContractAtSummaryTransformer.transform(
            input.employeeContract,
          )
        : null,
      department: input.department
        ? await HrmTimeTrackDepartmentAtSummaryTransformer.transform(
            input.department,
          )
        : null,
    };
  }
}
