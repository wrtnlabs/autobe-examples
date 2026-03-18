import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import type { IHrmTimeTrackingProjectMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProjectMembership";
import type { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import type { IHrmTimeTrackingUserAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingUserAccount";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackingProjectMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingProjectMembership";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_time_tracking_member_projects_create } from "../../../generate/generate_random_hrm_time_tracking_member_projects_create";
import { prepare_random_hrm_time_tracking_project } from "../../../prepare/prepare_random_hrm_time_tracking_project";

export async function test_api_project_members_pagination_and_search(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorization = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IHrmTimeTrackingMember.IJoin,
  });
  typia.assert(authorization);
  const project =
    await generate_random_hrm_time_tracking_member_projects_create(
      memberConnection,
      {
        body: {
          name: `${RandomGenerator.name(2)} ${RandomGenerator.alphabets(6)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          colorCode: `#${RandomGenerator.alphabets(6)}`,
          status: "active",
          budgetHours: 100,
        } satisfies IHrmTimeTrackingProject.ICreate,
      },
    );
  typia.assert(project);
  const firstPage =
    await api.functional.hrmTimeTracking.member.projects.members.index(
      memberConnection,
      {
        projectId: project.id,
        body: {
          page: 1,
          pageSize: 5,
          sort: "createdAt",
        } satisfies IHrmTimeTrackingProjectMembership.IRequest,
      },
    );
  typia.assert(firstPage);
  const repeatedFirstPage =
    await api.functional.hrmTimeTracking.member.projects.members.index(
      memberConnection,
      {
        projectId: project.id,
        body: {
          page: 1,
          pageSize: 5,
          sort: "createdAt",
        } satisfies IHrmTimeTrackingProjectMembership.IRequest,
      },
    );
  typia.assert(repeatedFirstPage);
  TestValidator.equals(
    "first page current should be 1",
    firstPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "first page limit should be 5",
    firstPage.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "first page records should be non-negative",
    firstPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "first page pages should be non-negative",
    firstPage.pagination.pages >= 0,
  );
  TestValidator.equals(
    "repeated first page should be stable",
    repeatedFirstPage.data.map((item) => item.id),
    firstPage.data.map((item) => item.id),
  );
  TestValidator.predicate(
    "first page should not duplicate members",
    new Set(firstPage.data.map((item) => item.id)).size ===
      firstPage.data.length,
  );
  TestValidator.predicate(
    "project lead flags should be boolean values",
    firstPage.data.every((item) => typeof item.isProjectLead === "boolean"),
  );
  const secondPage =
    await api.functional.hrmTimeTracking.member.projects.members.index(
      memberConnection,
      {
        projectId: project.id,
        body: {
          page: 2,
          pageSize: 5,
          sort: "createdAt",
        } satisfies IHrmTimeTrackingProjectMembership.IRequest,
      },
    );
  typia.assert(secondPage);
  TestValidator.equals(
    "second page current should be 2",
    secondPage.pagination.current,
    2,
  );
  TestValidator.equals(
    "second page limit should be 5",
    secondPage.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "second page should not duplicate members",
    new Set(secondPage.data.map((item) => item.id)).size ===
      secondPage.data.length,
  );
  TestValidator.predicate(
    "pages should be stable across repeated requests",
    secondPage.pagination.pages === firstPage.pagination.pages,
  );
  TestValidator.predicate(
    "first and second pages should not overlap when both contain data",
    firstPage.data.length === 0 || secondPage.data.length === 0
      ? true
      : !firstPage.data.some((first) =>
          secondPage.data.some((second) => second.id === first.id),
        ),
  );
  const searchResponse =
    await api.functional.hrmTimeTracking.member.projects.members.index(
      memberConnection,
      {
        projectId: project.id,
        body: {
          page: 1,
          pageSize: 10,
          search: RandomGenerator.alphabets(3),
          sort: "createdAt",
        } satisfies IHrmTimeTrackingProjectMembership.IRequest,
      },
    );
  typia.assert(searchResponse);
  TestValidator.predicate(
    "search response should remain paginated",
    searchResponse.pagination.current === 1 &&
      searchResponse.pagination.limit === 10,
  );
  TestValidator.predicate(
    "search response should not duplicate members",
    new Set(searchResponse.data.map((item) => item.id)).size ===
      searchResponse.data.length,
  );
  TestValidator.predicate(
    "search response should preserve lead-flag typing",
    searchResponse.data.every(
      (item) => typeof item.isProjectLead === "boolean",
    ),
  );
}
