import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingReport";
import { IHrmTimeTrackingReportEmployeeFilter } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingReportEmployeeFilter";
import { IHrmTimeTrackingReportProjectFilter } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingReportProjectFilter";
import { IHrmTimeTrackingReportTaskFilter } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingReportTaskFilter";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { HrmTimeTrackingReportEmployeeFilterCollector } from "./HrmTimeTrackingReportEmployeeFilterCollector";
import { HrmTimeTrackingReportProjectFilterCollector } from "./HrmTimeTrackingReportProjectFilterCollector";
import { HrmTimeTrackingReportTaskFilterCollector } from "./HrmTimeTrackingReportTaskFilterCollector";

export namespace HrmTimeTrackingReportCollector {
  export async function collect(props: {
    body: IHrmTimeTrackingReport.ICreate;
    hrmTimeTrackingOrganizations: IEntity;
  }) {
    const id: string = v4();
    const now: Date = new Date();
    return {
      id,
      name: props.body.name,
      report_type: props.body.reportType,
      range_start_date: props.body.rangeStartDate
        ? new Date(props.body.rangeStartDate)
        : null,
      range_end_date: props.body.rangeEndDate
        ? new Date(props.body.rangeEndDate)
        : null,
      group_by: props.body.groupBy ?? null,
      billable_only: props.body.billableOnly ?? null,
      include_non_billable: props.body.includeNonBillable ?? null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      organization: {
        connect: {
          id: props.hrmTimeTrackingOrganizations.id,
        },
      },
      snapshots: undefined,
      reportEmployeeFilters:
        props.body.employeeFilters && props.body.employeeFilters.length
          ? {
              create: await ArrayUtil.asyncMap(
                props.body.employeeFilters,
                async (body) =>
                  HrmTimeTrackingReportEmployeeFilterCollector.collect({
                    body,
                    report: { id },
                  }),
              ),
            }
          : undefined,
      projectFilters:
        props.body.projectFilters && props.body.projectFilters.length
          ? {
              create: await ArrayUtil.asyncMap(
                props.body.projectFilters,
                async (body) =>
                  HrmTimeTrackingReportProjectFilterCollector.collect({
                    body,
                    report: { id },
                  }),
              ),
            }
          : undefined,
      taskFilters:
        props.body.taskFilters && props.body.taskFilters.length
          ? {
              create: await ArrayUtil.asyncMap(
                props.body.taskFilters,
                async (body) =>
                  HrmTimeTrackingReportTaskFilterCollector.collect({
                    body,
                    hrmTimeTrackingReports: { id },
                  }),
              ),
            }
          : undefined,
    } satisfies Prisma.hrm_time_tracking_reportsCreateInput;
  }
}
