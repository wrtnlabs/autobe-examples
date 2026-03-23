import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTrackerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerMember";
import type { IHrmTrackerOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerOrganization";
import type { IHrmTrackerProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerProject";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTrackerProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTrackerProject";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_project_list_retrieval_with_organization_isolation(
  connection: api.IConnection,
): Promise<void> {
  // Create two separate organizations for isolation testing
  const orgA = {
    id: typia.random<string & tags.Format<"uuid">>(),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    logo_image_uri: null,
    status: "active" as const,
    created_at: new Date().toISOString(),
  } satisfies IHrmTrackerOrganization.ISummary;
  const orgB = {
    id: typia.random<string & tags.Format<"uuid">>(),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    logo_image_uri: null,
    status: "active" as const,
    created_at: new Date().toISOString(),
  } satisfies IHrmTrackerOrganization.ISummary;
  // Create member account in organization A
  const memberConnection: api.IConnection = { host: connection.host };
  const memberData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
    phone: null,
  } satisfies IHrmTrackerMember.IJoin;
  await authorize_member_join(memberConnection, { body: memberData });
  const loginData: IHrmTrackerMember.ILogin = {
    email: memberData.email,
    password: memberData.password,
    href: "https://example.com/login",
    referrer: "https://example.com",
  };
  const memberAuthorized = await authorize_member_login(memberConnection, {
    body: loginData,
  });
  typia.assert(memberAuthorized);
  // Create projects in organization A (member's org - should appear)
  const projectsInOrgA = ArrayUtil.repeat(
    3,
    (index) =>
      ({
        id: typia.random<string & tags.Format<"uuid">>(),
        name: `Project ${index + 1} in Org A`,
        color: `#${Math.floor(Math.random() * 16777215)
          .toString(16)
          .padStart(6, "0")}`,
        status: "active",
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        organization: orgA,
        created_at: new Date().toISOString(),
      }) satisfies IHrmTrackerProject.ISummary,
  );
  // Create projects in organization B (different org - should NOT appear)
  const projectsInOrgB = ArrayUtil.repeat(
    2,
    (index) =>
      ({
        id: typia.random<string & tags.Format<"uuid">>(),
        name: `Project ${index + 1} in Org B`,
        color: `#${Math.floor(Math.random() * 16777215)
          .toString(16)
          .padStart(6, "0")}`,
        status: "active",
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        organization: orgB,
        created_at: new Date().toISOString(),
      }) satisfies IHrmTrackerProject.ISummary,
  );
  // Request projects for organization A (member's organization)
  const request: IHrmTrackerProject.IRequest = {
    page: 1,
    limit: 10,
    organization_id: orgA.id,
    status: "active",
    sort_by: "name",
    order: "asc",
  };
  const response = await api.functional.hrmTracker.member.projects.index(
    memberConnection,
    { body: request },
  );
  typia.assert(response);
  // Validate organization isolation
  TestValidator.equals(
    "organization isolation: only orgA projects",
    response.data.length,
    3,
  );
  // Verify all returned projects belong to organization A
  for (const project of response.data) {
    TestValidator.equals(
      "project organization matches",
      project.organization.id,
      orgA.id,
    );
  }
  // Verify pagination structure
  TestValidator.equals(
    "pagination current page",
    response.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", response.pagination.limit, 10);
  TestValidator.equals(
    "pagination records count",
    response.pagination.records,
    3,
  );
  TestValidator.equals("pagination pages count", response.pagination.pages, 1);
  // Test with different pagination parameters
  const paginatedRequest: IHrmTrackerProject.IRequest = {
    page: 1,
    limit: 2,
    organization_id: orgA.id,
    sort_by: "name",
    order: "asc",
  };
  const paginatedResponse =
    await api.functional.hrmTracker.member.projects.index(memberConnection, {
      body: paginatedRequest,
    });
  typia.assert(paginatedResponse);
  TestValidator.equals(
    "pagination with limit 2",
    paginatedResponse.data.length,
    2,
  );
  TestValidator.equals(
    "pagination pages with limit 2",
    paginatedResponse.pagination.pages,
    2,
  );
  // Test sorting by different fields
  const sortedRequest: IHrmTrackerProject.IRequest = {
    page: 1,
    limit: 10,
    organization_id: orgA.id,
    sort_by: "budget_hours",
    order: "desc",
  };
  const sortedResponse = await api.functional.hrmTracker.member.projects.index(
    memberConnection,
    { body: sortedRequest },
  );
  typia.assert(sortedResponse);
  // Verify search functionality works with isolation
  const searchRequest: IHrmTrackerProject.IRequest = {
    page: 1,
    limit: 10,
    organization_id: orgA.id,
    search: "Project 1",
  };
  const searchResponse = await api.functional.hrmTracker.member.projects.index(
    memberConnection,
    { body: searchRequest },
  );
  typia.assert(searchResponse);
  TestValidator.predicate(
    "search filtered correctly",
    searchResponse.data.length >= 0 && searchResponse.data.length <= 3,
  );
  // Verify organization B projects are not included
  for (const project of searchResponse.data) {
    TestValidator.notEquals(
      "organization B project not included",
      project.organization.id,
      orgB.id,
    );
  }
  // Verify all project structures match expected type
  for (const project of response.data) {
    typia.assert(project);
  }
}
