import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmsEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsEmployee";
import { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import { IHrmsProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsProject";
import { IHrmsTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimelog";
import { IHrmsTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimesheet";
import { IWeekRange } from "@ORGANIZATION/PROJECT-api/lib/structures/IWeekRange";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmsMemberAtSummaryTransformer } from "./HrmsMemberAtSummaryTransformer";

export namespace HrmsTimesheetTransformer {
  export type Payload = Prisma.hrms_timesheetsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        week_start_date: true,
        week_end_date: true,
        status: true,
        total_hours: true,
        submitted_at: true,
        reviewed_at: true,
        rejection_reason: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        employee: true,
        reviewer: HrmsMemberAtSummaryTransformer.select(),
      },
    } satisfies Prisma.hrms_timesheetsFindManyArgs;
  }
  export async function transform(input: Payload): Promise<IHrmsTimesheet> {
    const timelogsPayload = await MyGlobal.prisma.hrms_timelogs.findMany({
      where: {
        date: {
          gte: input.week_start_date,
          lte: input.week_end_date,
        },
        employee_id: input.employee.id,
      },
      include: {
        project: true,
        task: true,
      },
    });
    return {
      id: input.id,
      employee: {
        id: input.employee.id,
        display_name: input.employee.display_name,
        position: input.employee.position ?? undefined,
        department_id: input.employee.department_id,
        status: input.employee.status,
      } satisfies IHrmsEmployee.ISummary,
      reviewer: input.reviewer
        ? await HrmsMemberAtSummaryTransformer.transform(input.reviewer)
        : null,
      timelogs: [] as IHrmsTimelog[],
      week_start_date: input.week_start_date.toISOString(),
      week_end_date: input.week_end_date.toISOString(),
      status: input.status,
      total_hours: input.total_hours,
      submitted_at: input.submitted_at?.toISOString() ?? null,
      reviewed_at: input.reviewed_at?.toISOString() ?? null,
      rejection_reason: input.rejection_reason ?? undefined,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
}
