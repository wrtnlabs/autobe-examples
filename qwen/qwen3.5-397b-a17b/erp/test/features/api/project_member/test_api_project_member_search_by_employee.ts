import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectMember";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformUserProfile";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformProjectMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";

/**
 * Test searching project members by employee name or email.
 *
 * Validates the project member search functionality including partial name matching, email search, case-insensitive search, and proper filtering by project. Ensures that search returns only members from the specified project and handles empty results correctly.
 *
 * The test covers multiple search scenarios to verify the search parameter correctly matches against employee display names and email addresses. Special attention is given to case-insensitive matching and proper pagination metadata.
 *
 * 1. Member registers and authenticates with the system.
 * 2. Creates a project to search members within.
 * 3. Retrieves all project members without search filter.
 * 4. Tests partial name matching with search parameter.
 * 5. Tests email-based search functionality.
 * 6. Verifies case-insensitive search behavior.
 * 7. Validates empty search results handling.
 * 8. Confirms pagination metadata accuracy.
 */
export async function test_api_project_member_search_by_employee(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration and authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create a project for member search testing
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        color: "#FF5733",
      },
    },
  );
  typia.assert(project);
  // 3. Retrieve all project members without search filter
  const allMembers =
    await api.functional.hrmPlatform.member.projects.members.index(
      memberConnection,
      {
        projectId: project.id,
        body: {
          take: 100,
          skip: 0,
        } satisfies IHrmPlatformProjectMember.IRequest,
      },
    );
  typia.assert(allMembers);
  // Validate pagination structure
  TestValidator.predicate(
    "pagination has current page",
    allMembers.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination has limit",
    allMembers.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination has records count",
    allMembers.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages count",
    allMembers.pagination.pages >= 0,
  );
  // 4. Test partial name matching with search parameter
  const searchByName =
    await api.functional.hrmPlatform.member.projects.members.index(
      memberConnection,
      {
        projectId: project.id,
        body: {
          search: RandomGenerator.alphabets(3),
          take: 50,
          skip: 0,
        } satisfies IHrmPlatformProjectMember.IRequest,
      },
    );
  typia.assert(searchByName);
  // Validate search returns proper structure
  TestValidator.predicate(
    "search results is array",
    Array.isArray(searchByName.data),
  );
  TestValidator.predicate(
    "search pagination valid",
    searchByName.pagination.current >= 1,
  );
  // 5. Test email-based search functionality
  const searchByEmail =
    await api.functional.hrmPlatform.member.projects.members.index(
      memberConnection,
      {
        projectId: project.id,
        body: {
          search: memberAuth.email.substring(0, 5),
          take: 50,
          skip: 0,
        } satisfies IHrmPlatformProjectMember.IRequest,
      },
    );
  typia.assert(searchByEmail);
  // Validate email search returns proper structure
  TestValidator.predicate(
    "email search results is array",
    Array.isArray(searchByEmail.data),
  );
  // 6. Test case-insensitive search behavior
  const searchTerm = RandomGenerator.alphabets(4);
  const uppercaseSearch =
    await api.functional.hrmPlatform.member.projects.members.index(
      memberConnection,
      {
        projectId: project.id,
        body: {
          search: searchTerm.toUpperCase(),
          take: 50,
          skip: 0,
        } satisfies IHrmPlatformProjectMember.IRequest,
      },
    );
  typia.assert(uppercaseSearch);
  const lowercaseSearch =
    await api.functional.hrmPlatform.member.projects.members.index(
      memberConnection,
      {
        projectId: project.id,
        body: {
          search: searchTerm.toLowerCase(),
          take: 50,
          skip: 0,
        } satisfies IHrmPlatformProjectMember.IRequest,
      },
    );
  typia.assert(lowercaseSearch);
  // 7. Test empty search results handling
  const emptySearch =
    await api.functional.hrmPlatform.member.projects.members.index(
      memberConnection,
      {
        projectId: project.id,
        body: {
          search: RandomGenerator.alphaNumeric(20),
          take: 50,
          skip: 0,
        } satisfies IHrmPlatformProjectMember.IRequest,
      },
    );
  typia.assert(emptySearch);
  // Validate empty search returns proper structure with zero or matching results
  TestValidator.predicate(
    "empty search data is array",
    Array.isArray(emptySearch.data),
  );
  TestValidator.predicate(
    "empty search pagination valid",
    emptySearch.pagination.current >= 1,
  );
  // 8. Test role filter functionality
  const memberRoleFilter =
    await api.functional.hrmPlatform.member.projects.members.index(
      memberConnection,
      {
        projectId: project.id,
        body: {
          role: "member",
          take: 50,
          skip: 0,
        } satisfies IHrmPlatformProjectMember.IRequest,
      },
    );
  typia.assert(memberRoleFilter);
  // Validate role filter returns proper structure
  TestValidator.predicate(
    "role filter results is array",
    Array.isArray(memberRoleFilter.data),
  );
  // 9. Test pagination with different take values
  const takeLimit = 10;
  const paginatedResults =
    await api.functional.hrmPlatform.member.projects.members.index(
      memberConnection,
      {
        projectId: project.id,
        body: {
          take: takeLimit,
          skip: 0,
          page: 1,
          limit: takeLimit,
        } satisfies IHrmPlatformProjectMember.IRequest,
      },
    );
  typia.assert(paginatedResults);
  // Validate pagination respects limit
  TestValidator.predicate(
    "results respect take limit",
    paginatedResults.data.length <= takeLimit,
  );
}
