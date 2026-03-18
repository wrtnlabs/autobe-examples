import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import type { IHrmTimeTrackingReportProjectFilter } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingReportProjectFilter";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackingReportProjectFilter } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingReportProjectFilter";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_report_project_filters_organization_scope_isolated(
  connection: api.IConnection,
): Promise<void> {
  const scopedConnection: api.IConnection = {
    ...connection,
    host: connection.host,
  };
  const body = {
    page: 1 satisfies number as number,
    limit: 10 satisfies number as number,
    sort: "created_at DESC",
  } satisfies IHrmTimeTrackingReportProjectFilter.IRequest;
  await TestValidator.httpError(
    "cross-organization report project filters access is rejected without leaking existence",
    [403, 404],
    async () => {
      await api.functional.hrmTimeTracking.reports.projectFilters.index(
        scopedConnection,
        {
          reportId: typia.random<string & tags.Format<"uuid">>(),
          body,
        },
      );
    },
  );
}
