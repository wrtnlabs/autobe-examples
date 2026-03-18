import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsEmployee";
import type { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import type { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import type { IHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationMember";
import type { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import type { IHrmsProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsProject";
import type { IHrmsTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTask";
import type { IHrmsTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimelog";
import type { IHrmsTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimer";
import type { IHrmsTopEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTopEmployee";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmsOrganization";
import type { IPageIHrmsProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmsProject";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrms_member_organizations_projects_create } from "../../../generate/generate_random_hrms_member_organizations_projects_create";
import { prepare_random_hrms_project } from "../../../prepare/prepare_random_hrms_project";

export async function test_api_projects_listing_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member joins system
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuthorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123" satisfies string & tags.MinLength<8>,
      display_name: RandomGenerator.name(),
      href: "https://example.com/join" satisfies string & tags.Format<"uri">,
      referrer: "https://example.com" satisfies string & tags.Format<"uri">,
    },
  });
  typia.assert(memberAuthorized);
  // 2. Get member's organizations
  const orgConnection: api.IConnection = { host: connection.host };
  orgConnection.headers = { Authorization: memberAuthorized.token.access };
  const orgResponse = await api.functional.hrms.member.organizations.index(
    orgConnection,
    {
      body: {
        currency: undefined,
        timezone: undefined,
        page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 10 satisfies number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
      },
    },
  );
  typia.assert(orgResponse);
  TestValidator.predicate(
    "organizations returned",
    orgResponse.data.length > 0,
  );
  const organizationId = orgResponse.data[0].id;
  typia.assert(organizationId);
  // 3. Create test projects with different statuses
  const projectConnection: api.IConnection = { host: connection.host };
  projectConnection.headers = { Authorization: memberAuthorized.token.access };
  await Promise.all(
    ArrayUtil.repeat(4, (index: number) => {
      const status: "active" | "archived" | "completed" =
        index === 0
          ? "active"
          : index === 1
            ? "archived"
            : index === 2
              ? "completed"
              : "active";
      return api.functional.hrms.member.organizations.projects.create(
        projectConnection,
        {
          organizationId,
          body: {
            name: `Test Project ${index + 1}`,
            description: `Test project with ${status} status`,
            color_code: `#${(Math.random() * 16777215).toString(16).padStart(6, "0")}`,
            budget_hours: typia.random<
              number & tags.Type<"uint32"> & tags.Minimum<10>
            >(),
            start_date: new Date().toISOString() satisfies string &
              tags.Format<"date-time">,
            end_date: new Date(
              Date.now() + 30 * 24 * 60 * 60 * 1000,
            ).toISOString() satisfies string & tags.Format<"date-time">,
          } satisfies IHrmsProject.ICreate,
        },
      );
    }),
  );
  // 4. Test status filter (active only)
  const statusFilterConnection: api.IConnection = { host: connection.host };
  statusFilterConnection.headers = {
    Authorization: memberAuthorized.token.access,
  };
  const statusFilterResponse =
    await api.functional.hrms.member.organizations.projects.index(
      statusFilterConnection,
      {
        organizationId,
        body: {
          status: "active" satisfies "active" | "archived" | "completed",
          date_from: undefined,
          date_to: undefined,
          cursor: undefined,
          limit: 100 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
          sort_by: undefined,
          order: undefined,
          page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<0>,
        },
      },
    );
  typia.assert(statusFilterResponse);
  // Verify only active projects returned
  statusFilterResponse.data.forEach((project) => {
    TestValidator.equals("status is active", project.status, "active");
  });
  // 5. Test date range filter
  const dateFrom = new Date().toISOString().split("T")[0] satisfies string &
    tags.Format<"date">;
  const dateTo = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0] satisfies string & tags.Format<"date">;
  const dateFilterConnection: api.IConnection = { host: connection.host };
  dateFilterConnection.headers = {
    Authorization: memberAuthorized.token.access,
  };
  const dateFilterResponse =
    await api.functional.hrms.member.organizations.projects.index(
      dateFilterConnection,
      {
        organizationId,
        body: {
          status: undefined,
          date_from: dateFrom,
          date_to: dateTo,
          cursor: undefined,
          limit: 100 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
          sort_by: undefined,
          order: undefined,
          page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<0>,
        },
      },
    );
  typia.assert(dateFilterResponse);
  // Verify all returned projects have dates within range
  dateFilterResponse.data.forEach((project) => {
    if (project.start_date) {
      const projectDate = new Date(project.start_date)
        .toISOString()
        .split("T")[0];
      TestValidator.predicate(
        "start date within range",
        projectDate >= dateFrom && projectDate <= dateTo,
      );
    }
  });
  // 6. Test sorting (ascending by name)
  const sortConnection: api.IConnection = { host: connection.host };
  sortConnection.headers = { Authorization: memberAuthorized.token.access };
  const sortResponse =
    await api.functional.hrms.member.organizations.projects.index(
      sortConnection,
      {
        organizationId,
        body: {
          status: undefined,
          date_from: undefined,
          date_to: undefined,
          cursor: undefined,
          limit: 100 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
          sort_by: "project_name" satisfies
            | "project_name"
            | "budget_utilization"
            | "actual_hours"
            | "created_at",
          order: "asc" satisfies "asc" | "desc",
          page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<0>,
        },
      },
    );
  typia.assert(sortResponse);
  // Verify sorted order
  for (let i = 1; i < sortResponse.data.length; i++) {
    TestValidator.predicate(
      "projects sorted ascending",
      sortResponse.data[i - 1].name.localeCompare(sortResponse.data[i].name) <=
        0,
    );
  }
  // 7. Test pagination with cursor
  const paginationConnection: api.IConnection = { host: connection.host };
  paginationConnection.headers = {
    Authorization: memberAuthorized.token.access,
  };
  const firstPageResponse =
    await api.functional.hrms.member.organizations.projects.index(
      paginationConnection,
      {
        organizationId,
        body: {
          status: undefined,
          date_from: undefined,
          date_to: undefined,
          cursor: undefined,
          limit: 2 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
          sort_by: undefined,
          order: undefined,
          page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<0>,
        },
      },
    );
  typia.assert(firstPageResponse);
  // Verify pagination metadata
  TestValidator.equals(
    "pagination current page",
    firstPageResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    firstPageResponse.pagination.limit,
    2,
  );
  TestValidator.predicate(
    "pagination records count",
    firstPageResponse.pagination.records > 0,
  );
  // 8. Test organization isolation
  firstPageResponse.data.forEach((project) => {
    TestValidator.equals(
      "organization id matches",
      project.organization_id,
      organizationId,
    );
  });
}
