import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingMember";
import type { IErpHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingProject";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimeTrackingProject";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_time_tracking_member_projects_create } from "../../../generate/generate_random_erp_hrm_time_tracking_member_projects_create";
import { prepare_random_erp_hrm_time_tracking_project } from "../../../prepare/prepare_random_erp_hrm_time_tracking_project";

export async function test_api_projects_index_empty_state_and_no_match_empty(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: empty state and no-match empty when filtering by status
  // --- Scenario 1: no projects ---
  const memberConnection1: api.IConnection = { host: connection.host };
  const authorized1 = await authorize_member_join(memberConnection1, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      organizationName: RandomGenerator.name(),
      organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
      organizationCurrencyCode: "USD",
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: 1,
      href: "https://example.com/join" satisfies string & tags.Format<"uri">,
      referrer: "https://example.com/ref" satisfies string & tags.Format<"uri">,
      ip: null,
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  void authorized1;
  const projectsPage1 =
    await api.functional.erpHrmTimeTracking.member.projects.index(
      memberConnection1,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IErpHrmTimeTrackingProject.IRequest,
      },
    );
  typia.assert(projectsPage1);
  TestValidator.equals(
    "projects empty array",
    projectsPage1.data,
    [] as IErpHrmTimeTrackingProject.ISummary[],
  );
  TestValidator.equals(
    "records should be 0",
    projectsPage1.pagination.records,
    0,
  );
  TestValidator.equals("pages should be 0", projectsPage1.pagination.pages, 0);
  // --- Scenario 2: status filter yields no matches ---
  const memberConnection2: api.IConnection = { host: connection.host };
  const authorized2 = await authorize_member_join(memberConnection2, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      organizationName: RandomGenerator.name(),
      organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
      organizationCurrencyCode: "USD",
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: 1,
      href: "https://example.com/join2" satisfies string & tags.Format<"uri">,
      referrer: "https://example.com/ref2" satisfies string &
        tags.Format<"uri">,
      ip: null,
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  void authorized2;
  const activeProject1 =
    await generate_random_erp_hrm_time_tracking_member_projects_create(
      memberConnection2,
      {
        body: {
          status: "active",
        } satisfies DeepPartial<IErpHrmTimeTrackingProject.ICreate>,
      },
    );
  typia.assert(activeProject1);
  const activeProject2 =
    await generate_random_erp_hrm_time_tracking_member_projects_create(
      memberConnection2,
      {
        body: {
          status: "active",
        } satisfies DeepPartial<IErpHrmTimeTrackingProject.ICreate>,
      },
    );
  typia.assert(activeProject2);
  await api.functional.erpHrmTimeTracking.member.projects.erase(
    memberConnection2,
    {
      projectId: activeProject1.id,
    },
  );
  const projectsPage2 =
    await api.functional.erpHrmTimeTracking.member.projects.index(
      memberConnection2,
      {
        body: {
          status: "archived",
          page: 1,
          limit: 10,
        } satisfies IErpHrmTimeTrackingProject.IRequest,
      },
    );
  typia.assert(projectsPage2);
  TestValidator.equals(
    "projects empty for archived filter",
    projectsPage2.data,
    [] as IErpHrmTimeTrackingProject.ISummary[],
  );
  TestValidator.equals(
    "records should be 0 for archived filter",
    projectsPage2.pagination.records,
    0,
  );
  TestValidator.equals(
    "pages should be 0 for archived filter",
    projectsPage2.pagination.pages,
    0,
  );
}
