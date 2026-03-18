import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingReport";
import { IHrmTimeTrackingReportEmployeeFilter } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingReportEmployeeFilter";
import { IHrmTimeTrackingReportProjectFilter } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingReportProjectFilter";
import { IHrmTimeTrackingReportTaskFilter } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingReportTaskFilter";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_hrm_time_tracking_report(
  input?: DeepPartial<IHrmTimeTrackingReport.ICreate>,
): IHrmTimeTrackingReport.ICreate {
  return {
    name: input?.name ?? RandomGenerator.name(3),
    reportType:
      input?.reportType ??
      RandomGenerator.pick([
        "summary",
        "detailed",
        "weekly",
        "project",
        "employee",
      ] as const),
    rangeStartDate:
      input?.rangeStartDate !== undefined
        ? input.rangeStartDate
        : typia.random<string & tags.Format<"date-time">>(),
    rangeEndDate:
      input?.rangeEndDate !== undefined
        ? input.rangeEndDate
        : typia.random<string & tags.Format<"date-time">>(),
    groupBy:
      input?.groupBy !== undefined
        ? input.groupBy
        : RandomGenerator.pick([
            "employee",
            "project",
            "task",
            "date",
          ] as const),
    billableOnly:
      input?.billableOnly !== undefined
        ? input.billableOnly
        : typia.random<boolean>(),
    includeNonBillable:
      input?.includeNonBillable !== undefined
        ? input.includeNonBillable
        : typia.random<boolean>(),
    employeeFilters: input?.employeeFilters
      ? input.employeeFilters.map((employeeFilter) => ({
          hrm_time_tracking_employee_id:
            employeeFilter.hrm_time_tracking_employee_id ??
            typia.random<string & tags.Format<"uuid">>(),
        }))
      : ArrayUtil.repeat(
          typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<3>
          >(),
          () => ({
            hrm_time_tracking_employee_id: typia.random<
              string & tags.Format<"uuid">
            >(),
          }),
        ),
    projectFilters: input?.projectFilters
      ? input.projectFilters.map((projectFilter) => ({
          projectIds: projectFilter.projectIds
            ? (Array.from(
                new Set(
                  projectFilter.projectIds.map(
                    (projectId) =>
                      projectId ?? typia.random<string & tags.Format<"uuid">>(),
                  ),
                ),
              ) as (string & tags.Format<"uuid">)[])
            : (Array.from(
                new Set(
                  ArrayUtil.repeat(
                    typia.random<
                      number &
                        tags.Type<"uint32"> &
                        tags.Minimum<1> &
                        tags.Maximum<3>
                    >(),
                    () => typia.random<string & tags.Format<"uuid">>(),
                  ),
                ),
              ) as (string & tags.Format<"uuid">)[]),
        }))
      : ArrayUtil.repeat(
          typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<3>
          >(),
          () => ({
            projectIds: Array.from(
              new Set(
                ArrayUtil.repeat(
                  typia.random<
                    number &
                      tags.Type<"uint32"> &
                      tags.Minimum<1> &
                      tags.Maximum<3>
                  >(),
                  () => typia.random<string & tags.Format<"uuid">>(),
                ),
              ),
            ) as (string & tags.Format<"uuid">)[],
          }),
        ),
    taskFilters: input?.taskFilters
      ? input.taskFilters.map((taskFilter) => ({
          task_id:
            taskFilter.task_id ?? typia.random<string & tags.Format<"uuid">>(),
        }))
      : ArrayUtil.repeat(
          typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<3>
          >(),
          () => ({
            task_id: typia.random<string & tags.Format<"uuid">>(),
          }),
        ),
  };
}
