import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import type { IHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmProject";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmProject";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test filtering project list by lifecycle status (active, archived, completed).
 *
 * Validates that the project list endpoint correctly filters projects based on status parameter. Queries projects with various status filters and verifies that only matching projects are returned in each case.
 *
 * 1. Register a member account and authenticate.
 * 2. Query project list with status='active' filter and validate results.
 * 3. Query project list with status='archived' filter and validate results.
 * 4. Query project list with status='completed' filter and validate results.
 * 5. Query project list without status filter to get all projects.
 * 6. Validate that filtered results are subsets of unfiltered results.
 */
export async function test_api_project_list_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth: IHrmMember.IAuthorized =
    await api.functional.hrm.auth.member.join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IHrmMember.IJoin,
    });
  typia.assert(memberAuth);
  // Note: Organization creation and project creation endpoints are not provided
  // in the available SDK functions. This test validates the filtering logic
  // assuming projects exist in the system. In a complete test suite, you would
  // create an organization and projects first using their respective creation endpoints.
  // Use a placeholder organization ID - in real scenario this would be a valid organization
  const organizationId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 2. Test filtering by 'active' status
  const activeFilter: IHrmProject.IRequest = {
    status: "active",
    page: 1,
    limit: 100,
  } satisfies IHrmProject.IRequest;
  const activeResult: IPageIHrmProject.ISummary =
    await api.functional.hrm.member.organizations.projects.index(
      memberConnection,
      {
        organizationId,
        body: activeFilter,
      },
    );
  typia.assert(activeResult);
  // Validate all returned projects have active status
  for (const project of activeResult.data) {
    TestValidator.equals(
      "active filter - project status",
      project.status,
      "active",
    );
  }
  // 3. Test filtering by 'archived' status
  const archivedFilter: IHrmProject.IRequest = {
    status: "archived",
    page: 1,
    limit: 100,
  } satisfies IHrmProject.IRequest;
  const archivedResult: IPageIHrmProject.ISummary =
    await api.functional.hrm.member.organizations.projects.index(
      memberConnection,
      {
        organizationId,
        body: archivedFilter,
      },
    );
  typia.assert(archivedResult);
  // Validate all returned projects have archived status
  for (const project of archivedResult.data) {
    TestValidator.equals(
      "archived filter - project status",
      project.status,
      "archived",
    );
  }
  // 4. Test filtering by 'completed' status
  const completedFilter: IHrmProject.IRequest = {
    status: "completed",
    page: 1,
    limit: 100,
  } satisfies IHrmProject.IRequest;
  const completedResult: IPageIHrmProject.ISummary =
    await api.functional.hrm.member.organizations.projects.index(
      memberConnection,
      {
        organizationId,
        body: completedFilter,
      },
    );
  typia.assert(completedResult);
  // Validate all returned projects have completed status
  for (const project of completedResult.data) {
    TestValidator.equals(
      "completed filter - project status",
      project.status,
      "completed",
    );
  }
  // 5. Test without status filter (should return all projects)
  const noFilter: IHrmProject.IRequest = {
    page: 1,
    limit: 100,
  } satisfies IHrmProject.IRequest;
  const allResult: IPageIHrmProject.ISummary =
    await api.functional.hrm.member.organizations.projects.index(
      memberConnection,
      {
        organizationId,
        body: noFilter,
      },
    );
  typia.assert(allResult);
  // Validate pagination metadata
  TestValidator.predicate(
    "pagination current page valid",
    allResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit valid",
    allResult.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    allResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    allResult.pagination.pages >= 0,
  );
  // 6. Validate that filtered result counts are <= unfiltered count
  TestValidator.predicate(
    "active count <= total count",
    activeResult.pagination.records <= allResult.pagination.records,
  );
  TestValidator.predicate(
    "archived count <= total count",
    archivedResult.pagination.records <= allResult.pagination.records,
  );
  TestValidator.predicate(
    "completed count <= total count",
    completedResult.pagination.records <= allResult.pagination.records,
  );
}
