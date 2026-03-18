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

export async function test_api_projects_index_status_scoped_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1) Join as a new member
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphabets(10);
  const memberConnectionBase: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnectionBase, {
    body: {
      email,
      password,
      organizationName: `org-${RandomGenerator.alphabets(6)}`,
      organizationDescription: RandomGenerator.paragraph({ sentences: 1 }),
      organizationCurrencyCode: "USD",
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: 1 satisfies number &
        tags.Type<"int32"> &
        tags.Minimum<1> &
        tags.Maximum<12>,
      href: `https://example.com/${RandomGenerator.alphabets(6)}`,
      referrer: `https://ref.example.com/${RandomGenerator.alphabets(6)}`,
      ip: null,
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  typia.assert(authorized);
  // authorize_member_join should populate Authorization on memberConnectionBase,
  // but we create an actor-specific connection for isolation.
  const memberConnection: api.IConnection = { host: connection.host };
  memberConnection.headers = { Authorization: authorized.token.access };
  const list = async (input: IErpHrmTimeTrackingProject.IRequest) => {
    const page = await api.functional.erpHrmTimeTracking.member.projects.index(
      memberConnection,
      { body: input },
    );
    typia.assert(page);
    return page;
  };
  // Create projects for Scenario 1
  const statuses = ["active", "archived", "completed"] as const;
  for (const status of statuses) {
    const project =
      await generate_random_erp_hrm_time_tracking_member_projects_create(
        memberConnection,
        {
          body: {
            name: `p-${status}-${RandomGenerator.alphabets(8)}`,
            color: `#${RandomGenerator.alphabets(6)}`,
            status,
          } satisfies IErpHrmTimeTrackingProject.ICreate,
        },
      );
    typia.assert(project);
  }
  // Scenario 1: status filter
  for (const status of statuses) {
    const page = await list({ status, page: 1, limit: 50 });
    TestValidator.predicate(`all returned status=${status}`, () =>
      page.data.every((x) => x.status === status),
    );
  }
  // Scenario 2: pagination boundary for filtered data
  const limit = 3 satisfies number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<100>;
  const desiredCount = 7;
  for (let i = 0; i < desiredCount; i++) {
    const project =
      await generate_random_erp_hrm_time_tracking_member_projects_create(
        memberConnection,
        {
          body: {
            name: `p-active-boundary-${i}-${RandomGenerator.alphabets(6)}`,
            color: `#${RandomGenerator.alphabets(6)}`,
            status: "active",
          } satisfies IErpHrmTimeTrackingProject.ICreate,
        },
      );
    typia.assert(project);
  }
  const filteredTotal = desiredCount + 1; // includes earlier active project
  const expectedPages = Math.ceil(filteredTotal / limit);
  const firstPage = await list({ status: "active", page: 1, limit });
  TestValidator.equals(
    "pagination current page (1)",
    firstPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination pages total",
    firstPage.pagination.pages,
    expectedPages,
  );
  TestValidator.equals(
    "records total equals created count",
    firstPage.pagination.records,
    filteredTotal,
  );
  TestValidator.equals(
    "first page data length",
    firstPage.data.length,
    Math.min(limit, filteredTotal),
  );
  TestValidator.predicate("first page all statuses match", () =>
    firstPage.data.every((x) => x.status === "active"),
  );
  const lastPageNumber = expectedPages satisfies number &
    tags.Type<"int32"> &
    tags.Minimum<1>;
  const lastPage = await list({
    status: "active",
    page: lastPageNumber,
    limit,
  });
  TestValidator.equals(
    "last page current equals expected",
    lastPage.pagination.current,
    lastPageNumber,
  );
  const remaining = filteredTotal - limit * (expectedPages - 1);
  TestValidator.equals("last page item count", lastPage.data.length, remaining);
  TestValidator.predicate("last page all statuses match", () =>
    lastPage.data.every((x) => x.status === "active"),
  );
  // Scenario 3: organization scoping (best-effort without explicit org-switch API)
  const scopedPage = await list({ status: "active", page: 1, limit: 10 });
  if (scopedPage.data.length > 0) {
    const expectedOrgId =
      scopedPage.data[0].erp_hrm_time_tracking_organization_id;
    TestValidator.predicate("scoped to same organization id", () =>
      scopedPage.data.every(
        (x) => x.erp_hrm_time_tracking_organization_id === expectedOrgId,
      ),
    );
  }
}
