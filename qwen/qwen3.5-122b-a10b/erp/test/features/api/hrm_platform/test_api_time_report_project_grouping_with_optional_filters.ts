import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import type { IHrmPlatformTimeReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimeReport";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformTimeReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformTimeReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_time_report_project_grouping_with_optional_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member account for authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Test time report with project grouping and filters
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);
  const endDate = new Date();
  // 2.1. General report grouped by project (no filters)
  const generalReport =
    await api.functional.hrmPlatform.member.reports.time.index(
      memberConnection,
      {
        body: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          groupBy: "project",
          page: 1,
          limit: 20,
        } satisfies IHrmPlatformTimeReport.IRequest,
      },
    );
  typia.assert(generalReport);
  // Validate general report structure
  TestValidator.predicate(
    "general report has pagination",
    generalReport.pagination !== undefined,
  );
  TestValidator.predicate(
    "general report pagination current >= 0",
    generalReport.pagination.current >= 0,
  );
  TestValidator.predicate(
    "general report pagination limit >= 0",
    generalReport.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "general report pagination records >= 0",
    generalReport.pagination.records >= 0,
  );
  TestValidator.predicate(
    "general report pagination pages >= 0",
    generalReport.pagination.pages >= 0,
  );
  // 2.2. Report filtered by project_id (if projects exist in report)
  if (generalReport.data.length > 0) {
    const projectWithTimelogs = generalReport.data.find(
      (entry) => entry.project !== undefined,
    );
    if (projectWithTimelogs && projectWithTimelogs.project) {
      const projectId = projectWithTimelogs.project.id;
      const projectFilteredReport =
        await api.functional.hrmPlatform.member.reports.time.index(
          memberConnection,
          {
            body: {
              startDate: startDate.toISOString(),
              endDate: endDate.toISOString(),
              groupBy: "project",
              project_id: projectId,
              page: 1,
              limit: 20,
            } satisfies IHrmPlatformTimeReport.IRequest,
          },
        );
      typia.assert(projectFilteredReport);
      // Validate project filter applied correctly
      TestValidator.predicate(
        "project filtered report only contains specified project",
        projectFilteredReport.data.every(
          (entry) => entry.project?.id === projectId,
        ),
      );
    }
  }
  // 2.3. Report filtered by billable status
  const billableReport =
    await api.functional.hrmPlatform.member.reports.time.index(
      memberConnection,
      {
        body: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          groupBy: "project",
          billable: true,
          page: 1,
          limit: 20,
        } satisfies IHrmPlatformTimeReport.IRequest,
      },
    );
  typia.assert(billableReport);
  // Validate billable filter - all entries should have billable_hours >= 0
  TestValidator.predicate(
    "billable report entries have valid billable hours",
    billableReport.data.every((entry) => entry.billable_hours >= 0),
  );
  // 2.4. Report filtered by both project_id and billable status
  if (generalReport.data.length > 0) {
    const projectWithTimelogs = generalReport.data.find(
      (entry) => entry.project !== undefined,
    );
    if (projectWithTimelogs && projectWithTimelogs.project) {
      const projectId = projectWithTimelogs.project.id;
      const combinedFilterReport =
        await api.functional.hrmPlatform.member.reports.time.index(
          memberConnection,
          {
            body: {
              startDate: startDate.toISOString(),
              endDate: endDate.toISOString(),
              groupBy: "project",
              project_id: projectId,
              billable: true,
              page: 1,
              limit: 20,
            } satisfies IHrmPlatformTimeReport.IRequest,
          },
        );
      typia.assert(combinedFilterReport);
      // Validate combined filter
      TestValidator.predicate(
        "combined filter report contains only specified project",
        combinedFilterReport.data.every(
          (entry) => entry.project?.id === projectId,
        ),
      );
    }
  }
  // 2.5. Test date range filtering
  const pastStartDate = new Date();
  pastStartDate.setFullYear(pastStartDate.getFullYear() - 1);
  const pastEndDate = new Date();
  pastEndDate.setFullYear(pastEndDate.getFullYear() - 1);
  pastEndDate.setDate(pastEndDate.getDate() + 30);
  const historicalReport =
    await api.functional.hrmPlatform.member.reports.time.index(
      memberConnection,
      {
        body: {
          startDate: pastStartDate.toISOString(),
          endDate: pastEndDate.toISOString(),
          groupBy: "project",
          page: 1,
          limit: 20,
        } satisfies IHrmPlatformTimeReport.IRequest,
      },
    );
  typia.assert(historicalReport);
  // Validate historical report date range
  TestValidator.predicate(
    "historical report entries within date range",
    historicalReport.data.every((entry) => {
      const entryStart = new Date(entry.date_range.start);
      const entryEnd = new Date(entry.date_range.end);
      return entryStart >= pastStartDate && entryEnd <= pastEndDate;
    }),
  );
  // 2.6. Test report entry structure validation
  if (generalReport.data.length > 0) {
    const firstEntry = generalReport.data[0];
    typia.assert(firstEntry);
    // Validate report entry fields
    TestValidator.predicate(
      "entry has uuid id",
      typeof firstEntry.id === "string",
    );
    TestValidator.predicate(
      "entry has total_hours",
      typeof firstEntry.total_hours === "number",
    );
    TestValidator.predicate(
      "entry has billable_hours",
      typeof firstEntry.billable_hours === "number",
    );
    TestValidator.predicate(
      "entry has non_billable_hours",
      typeof firstEntry.non_billable_hours === "number",
    );
    TestValidator.predicate(
      "total equals billable plus non-billable",
      firstEntry.total_hours ===
        firstEntry.billable_hours + firstEntry.non_billable_hours,
    );
    TestValidator.predicate(
      "date_range has start",
      typeof firstEntry.date_range.start === "string",
    );
    TestValidator.predicate(
      "date_range has end",
      typeof firstEntry.date_range.end === "string",
    );
  }
}