import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingReport";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackingReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_report_list_filtered_summary_browsing(
  connection: api.IConnection,
): Promise<void> {
  const reportConnection: api.IConnection = {
    host: connection.host,
    headers: connection.headers,
    simulate: connection.simulate,
    logger: connection.logger,
    encryption: connection.encryption,
    options: connection.options,
    fetch: connection.fetch,
  };
  const baselineRequest = {
    page: 1,
    limit: 100,
    sort: "updated_at_desc",
  } satisfies IHrmTimeTrackingReport.IRequest;
  const baseline = await api.functional.hrmTimeTracking.reports.index(
    reportConnection,
    {
      body: baselineRequest,
    },
  );
  typia.assert<IPageIHrmTimeTrackingReport.ISummary>(baseline);
  TestValidator.equals(
    "baseline current page matches request",
    baseline.pagination.current,
    baselineRequest.page,
  );
  TestValidator.equals(
    "baseline limit matches request",
    baseline.pagination.limit,
    baselineRequest.limit,
  );
  TestValidator.predicate(
    "baseline records non-negative",
    baseline.pagination.records >= 0,
  );
  TestValidator.predicate(
    "baseline pages non-negative",
    baseline.pagination.pages >= 0,
  );
  TestValidator.equals(
    "baseline pages consistent with records and limit",
    baseline.pagination.pages,
    baseline.pagination.records === 0
      ? 0
      : Math.ceil(baseline.pagination.records / baseline.pagination.limit),
  );
  TestValidator.predicate(
    "baseline page size does not exceed limit",
    baseline.data.length <= baseline.pagination.limit,
  );
  for (const report of baseline.data) {
    typia.assert<IHrmTimeTrackingReport.ISummary>(report);
    const record: Record<string, unknown> = report;
    TestValidator.equals(
      "summary omits employee_filters",
      Object.prototype.hasOwnProperty.call(record, "employee_filters"),
      false,
    );
    TestValidator.equals(
      "summary omits project_filters",
      Object.prototype.hasOwnProperty.call(record, "project_filters"),
      false,
    );
    TestValidator.equals(
      "summary omits task_filters",
      Object.prototype.hasOwnProperty.call(record, "task_filters"),
      false,
    );
  }
  const sample: IHrmTimeTrackingReport.ISummary | undefined = baseline.data[0];
  if (sample !== undefined) {
    const searchToken = sample.name.slice(
      0,
      Math.max(1, Math.min(sample.name.length, 4)),
    );
    const filteredRequest = {
      search: searchToken,
      report_type: sample.report_type,
      group_by: sample.group_by ?? undefined,
      billable_only: sample.billable_only ?? undefined,
      include_non_billable: sample.include_non_billable ?? undefined,
      sort: baselineRequest.sort,
      page: 1,
      limit: 100,
    } satisfies IHrmTimeTrackingReport.IRequest;
    const filtered = await api.functional.hrmTimeTracking.reports.index(
      reportConnection,
      {
        body: filteredRequest,
      },
    );
    typia.assert<IPageIHrmTimeTrackingReport.ISummary>(filtered);
    TestValidator.equals(
      "filtered current page matches request",
      filtered.pagination.current,
      filteredRequest.page,
    );
    TestValidator.equals(
      "filtered limit matches request",
      filtered.pagination.limit,
      filteredRequest.limit,
    );
    TestValidator.equals(
      "filtered pages consistent with records and limit",
      filtered.pagination.pages,
      filtered.pagination.records === 0
        ? 0
        : Math.ceil(filtered.pagination.records / filtered.pagination.limit),
    );
    TestValidator.predicate(
      "filtered page size does not exceed limit",
      filtered.data.length <= filtered.pagination.limit,
    );
    for (const report of filtered.data) {
      typia.assert<IHrmTimeTrackingReport.ISummary>(report);
      TestValidator.equals(
        "filtered report_type matches",
        report.report_type,
        filteredRequest.report_type,
      );
      if (filteredRequest.group_by !== undefined) {
        TestValidator.equals(
          "filtered group_by matches",
          report.group_by,
          filteredRequest.group_by,
        );
      }
      if (filteredRequest.billable_only !== undefined) {
        TestValidator.equals(
          "filtered billable_only matches",
          report.billable_only,
          filteredRequest.billable_only,
        );
      }
      if (filteredRequest.include_non_billable !== undefined) {
        TestValidator.equals(
          "filtered include_non_billable matches",
          report.include_non_billable,
          filteredRequest.include_non_billable,
        );
      }
      TestValidator.predicate(
        "filtered search matches name",
        report.name.toLowerCase().includes(searchToken.toLowerCase()),
      );
      const record: Record<string, unknown> = report;
      TestValidator.equals(
        "filtered summary omits employee_filters",
        Object.prototype.hasOwnProperty.call(record, "employee_filters"),
        false,
      );
      TestValidator.equals(
        "filtered summary omits project_filters",
        Object.prototype.hasOwnProperty.call(record, "project_filters"),
        false,
      );
      TestValidator.equals(
        "filtered summary omits task_filters",
        Object.prototype.hasOwnProperty.call(record, "task_filters"),
        false,
      );
    }
    const pagedRequest = {
      search: filteredRequest.search,
      report_type: filteredRequest.report_type,
      group_by: filteredRequest.group_by,
      billable_only: filteredRequest.billable_only,
      include_non_billable: filteredRequest.include_non_billable,
      sort: filteredRequest.sort,
      page: 1,
      limit: 1,
    } satisfies IHrmTimeTrackingReport.IRequest;
    const paged = await api.functional.hrmTimeTracking.reports.index(
      reportConnection,
      {
        body: pagedRequest,
      },
    );
    typia.assert<IPageIHrmTimeTrackingReport.ISummary>(paged);
    TestValidator.equals(
      "paged current page matches request",
      paged.pagination.current,
      pagedRequest.page,
    );
    TestValidator.equals(
      "paged limit matches request",
      paged.pagination.limit,
      pagedRequest.limit,
    );
    TestValidator.equals(
      "paged pages consistent with records and limit",
      paged.pagination.pages,
      paged.pagination.records === 0
        ? 0
        : Math.ceil(paged.pagination.records / paged.pagination.limit),
    );
    TestValidator.predicate(
      "paged page size does not exceed limit",
      paged.data.length <= paged.pagination.limit,
    );
    TestValidator.equals(
      "paged records align with broader filtered records",
      paged.pagination.records,
      filtered.pagination.records,
    );
    for (const report of paged.data) {
      typia.assert<IHrmTimeTrackingReport.ISummary>(report);
      TestValidator.equals(
        "paged report_type matches",
        report.report_type,
        pagedRequest.report_type,
      );
      if (pagedRequest.group_by !== undefined) {
        TestValidator.equals(
          "paged group_by matches",
          report.group_by,
          pagedRequest.group_by,
        );
      }
      if (pagedRequest.billable_only !== undefined) {
        TestValidator.equals(
          "paged billable_only matches",
          report.billable_only,
          pagedRequest.billable_only,
        );
      }
      if (pagedRequest.include_non_billable !== undefined) {
        TestValidator.equals(
          "paged include_non_billable matches",
          report.include_non_billable,
          pagedRequest.include_non_billable,
        );
      }
      TestValidator.predicate(
        "paged search matches name",
        report.name.toLowerCase().includes(searchToken.toLowerCase()),
      );
      const record: Record<string, unknown> = report;
      TestValidator.equals(
        "paged summary omits employee_filters",
        Object.prototype.hasOwnProperty.call(record, "employee_filters"),
        false,
      );
      TestValidator.equals(
        "paged summary omits project_filters",
        Object.prototype.hasOwnProperty.call(record, "project_filters"),
        false,
      );
      TestValidator.equals(
        "paged summary omits task_filters",
        Object.prototype.hasOwnProperty.call(record, "task_filters"),
        false,
      );
    }
    if (paged.pagination.records > 1) {
      const secondPageRequest = {
        search: pagedRequest.search,
        report_type: pagedRequest.report_type,
        group_by: pagedRequest.group_by,
        billable_only: pagedRequest.billable_only,
        include_non_billable: pagedRequest.include_non_billable,
        sort: pagedRequest.sort,
        page: 2,
        limit: 1,
      } satisfies IHrmTimeTrackingReport.IRequest;
      const secondPage = await api.functional.hrmTimeTracking.reports.index(
        reportConnection,
        {
          body: secondPageRequest,
        },
      );
      typia.assert<IPageIHrmTimeTrackingReport.ISummary>(secondPage);
      TestValidator.equals(
        "second page current matches request",
        secondPage.pagination.current,
        secondPageRequest.page,
      );
      TestValidator.equals(
        "second page limit matches request",
        secondPage.pagination.limit,
        secondPageRequest.limit,
      );
      TestValidator.equals(
        "second page records align with first paged records",
        secondPage.pagination.records,
        paged.pagination.records,
      );
      TestValidator.equals(
        "second page pages consistent with records and limit",
        secondPage.pagination.pages,
        secondPage.pagination.records === 0
          ? 0
          : Math.ceil(
              secondPage.pagination.records / secondPage.pagination.limit,
            ),
      );
      TestValidator.predicate(
        "second page size does not exceed limit",
        secondPage.data.length <= secondPage.pagination.limit,
      );
      for (const report of secondPage.data) {
        typia.assert<IHrmTimeTrackingReport.ISummary>(report);
        TestValidator.equals(
          "second page report_type matches",
          report.report_type,
          secondPageRequest.report_type,
        );
        if (secondPageRequest.group_by !== undefined) {
          TestValidator.equals(
            "second page group_by matches",
            report.group_by,
            secondPageRequest.group_by,
          );
        }
        if (secondPageRequest.billable_only !== undefined) {
          TestValidator.equals(
            "second page billable_only matches",
            report.billable_only,
            secondPageRequest.billable_only,
          );
        }
        if (secondPageRequest.include_non_billable !== undefined) {
          TestValidator.equals(
            "second page include_non_billable matches",
            report.include_non_billable,
            secondPageRequest.include_non_billable,
          );
        }
        TestValidator.predicate(
          "second page search matches name",
          report.name.toLowerCase().includes(searchToken.toLowerCase()),
        );
        const record: Record<string, unknown> = report;
        TestValidator.equals(
          "second page summary omits employee_filters",
          Object.prototype.hasOwnProperty.call(record, "employee_filters"),
          false,
        );
        TestValidator.equals(
          "second page summary omits project_filters",
          Object.prototype.hasOwnProperty.call(record, "project_filters"),
          false,
        );
        TestValidator.equals(
          "second page summary omits task_filters",
          Object.prototype.hasOwnProperty.call(record, "task_filters"),
          false,
        );
      }
      if (paged.data[0] !== undefined && secondPage.data[0] !== undefined) {
        TestValidator.notEquals(
          "page 1 and page 2 do not overlap",
          paged.data[0].id,
          secondPage.data[0].id,
        );
      }
    }
  } else {
    const emptyFilterRequest = {
      search: RandomGenerator.alphaNumeric(16),
      sort: baselineRequest.sort,
      page: 1,
      limit: 10,
    } satisfies IHrmTimeTrackingReport.IRequest;
    const emptyFiltered = await api.functional.hrmTimeTracking.reports.index(
      reportConnection,
      {
        body: emptyFilterRequest,
      },
    );
    typia.assert<IPageIHrmTimeTrackingReport.ISummary>(emptyFiltered);
    TestValidator.equals(
      "empty-filter current page matches request",
      emptyFiltered.pagination.current,
      emptyFilterRequest.page,
    );
    TestValidator.equals(
      "empty-filter limit matches request",
      emptyFiltered.pagination.limit,
      emptyFilterRequest.limit,
    );
    TestValidator.equals(
      "empty-filter pages consistent with records and limit",
      emptyFiltered.pagination.pages,
      emptyFiltered.pagination.records === 0
        ? 0
        : Math.ceil(
            emptyFiltered.pagination.records / emptyFiltered.pagination.limit,
          ),
    );
    TestValidator.predicate(
      "empty-filter page size does not exceed limit",
      emptyFiltered.data.length <= emptyFiltered.pagination.limit,
    );
    for (const report of emptyFiltered.data) {
      typia.assert<IHrmTimeTrackingReport.ISummary>(report);
      TestValidator.predicate(
        "empty-filter search matches name",
        report.name
          .toLowerCase()
          .includes((emptyFilterRequest.search ?? "").toLowerCase()),
      );
      const record: Record<string, unknown> = report;
      TestValidator.equals(
        "empty-filter summary omits employee_filters",
        Object.prototype.hasOwnProperty.call(record, "employee_filters"),
        false,
      );
      TestValidator.equals(
        "empty-filter summary omits project_filters",
        Object.prototype.hasOwnProperty.call(record, "project_filters"),
        false,
      );
      TestValidator.equals(
        "empty-filter summary omits task_filters",
        Object.prototype.hasOwnProperty.call(record, "task_filters"),
        false,
      );
    }
  }
}
