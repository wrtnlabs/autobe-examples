import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import { IHrmTimeTrackingReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingReport";
import { IHrmTimeTrackingReportEmployeeFilter } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingReportEmployeeFilter";
import { IHrmTimeTrackingReportProjectFilter } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingReportProjectFilter";
import { IHrmTimeTrackingReportTaskFilter } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingReportTaskFilter";
import { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmTimeTrackingOrganizationAtSummaryTransformer } from "./HrmTimeTrackingOrganizationAtSummaryTransformer";
import { HrmTimeTrackingReportEmployeeFilterTransformer } from "./HrmTimeTrackingReportEmployeeFilterTransformer";
import { HrmTimeTrackingReportProjectFilterTransformer } from "./HrmTimeTrackingReportProjectFilterTransformer";
import { HrmTimeTrackingReportTaskFilterTransformer } from "./HrmTimeTrackingReportTaskFilterTransformer";

export namespace HrmTimeTrackingReportTransformer {
  export async function transform(
    input: Payload,
  ): Promise<IHrmTimeTrackingReport> {
    return {
      id: input.id,
      organization:
        await HrmTimeTrackingOrganizationAtSummaryTransformer.transform(
          input.organization,
        ),
      name: input.name,
      reportType: input.report_type,
      rangeStartDate: input.range_start_date?.toISOString() ?? null,
      rangeEndDate: input.range_end_date?.toISOString() ?? null,
      groupBy: input.group_by ?? null,
      billableOnly: input.billable_only ?? null,
      includeNonBillable: input.include_non_billable ?? null,
      reportEmployeeFilters: await ArrayUtil.asyncMap(
        input.reportEmployeeFilters,
        HrmTimeTrackingReportEmployeeFilterTransformer.transform,
      ),
      projectFilters: await ArrayUtil.asyncMap(
        input.projectFilters,
        HrmTimeTrackingReportProjectFilterTransformer.transform,
      ),
      taskFilters: await ArrayUtil.asyncMap(
        input.taskFilters,
        HrmTimeTrackingReportTaskFilterTransformer.transform,
      ),
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
    };
  }
  export function select() {
    return {
      select: {
        id: true,
        organization: HrmTimeTrackingOrganizationAtSummaryTransformer.select(),
        name: true,
        report_type: true,
        range_start_date: true,
        range_end_date: true,
        group_by: true,
        billable_only: true,
        include_non_billable: true,
        reportEmployeeFilters:
          HrmTimeTrackingReportEmployeeFilterTransformer.select(),
        projectFilters: HrmTimeTrackingReportProjectFilterTransformer.select(),
        taskFilters: HrmTimeTrackingReportTaskFilterTransformer.select(),
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    } satisfies Prisma.hrm_time_tracking_reportsFindManyArgs;
  }
  export type Payload = Prisma.hrm_time_tracking_reportsGetPayload<
    ReturnType<typeof select>
  >;
}
