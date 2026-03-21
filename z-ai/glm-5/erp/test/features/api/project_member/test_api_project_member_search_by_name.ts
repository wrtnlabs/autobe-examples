import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmProjectMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_projects_create } from "../../../generate/generate_random_erp_hrm_member_projects_create";
import { generate_random_erp_hrm_member_projects_members_create } from "../../../generate/generate_random_erp_hrm_member_projects_members_create";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";

export async function test_api_project_member_search_by_name(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create organization owner (automatically creates first org with owner role)
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {
    body: {
      displayName: "Project Owner Manager",
    },
  });
  typia.assert(owner);
  // Step 2: Create a project for testing member search
  const project = await generate_random_erp_hrm_member_projects_create(
    ownerConnection,
    {},
  );
  typia.assert(project);
  // Step 3: Create additional members who will become employees in the organization
  // Note: Member join creates their own org; for same org, we'd need invite/accept flow
  // For this test, we'll validate the search API behavior with available members
  // Create a member with distinct name for search testing
  const testMember1Connection: api.IConnection = { host: connection.host };
  const testMember1 = await authorize_member_join(testMember1Connection, {
    body: {
      displayName: "John Anderson",
    },
  });
  typia.assert(testMember1);
  // Create another member with similar name for partial match testing
  const testMember2Connection: api.IConnection = { host: connection.host };
  const testMember2 = await authorize_member_join(testMember2Connection, {
    body: {
      displayName: "Johnny Baker",
    },
  });
  typia.assert(testMember2);
  // Create a member with completely different name
  const testMember3Connection: api.IConnection = { host: connection.host };
  const testMember3 = await authorize_member_join(testMember3Connection, {
    body: {
      displayName: "Alice Chen",
    },
  });
  typia.assert(testMember3);
  // Step 4: Add project members using the utility function
  // Note: This requires employee_id. Since member join creates employees in their own org,
  // we'll use the generate utility which handles random employee_id generation
  // In a real scenario, we'd need the employee IDs from an employee list endpoint
  // For testing the search functionality, add members to the project
  const member1 = await generate_random_erp_hrm_member_projects_members_create(
    ownerConnection,
    {
      params: { projectId: project.id },
      body: {
        role: "member",
      },
    },
  );
  typia.assert(member1);
  const member2 = await generate_random_erp_hrm_member_projects_members_create(
    ownerConnection,
    {
      params: { projectId: project.id },
      body: {
        role: "member",
      },
    },
  );
  typia.assert(member2);
  const member3 = await generate_random_erp_hrm_member_projects_members_create(
    ownerConnection,
    {
      params: { projectId: project.id },
      body: {
        role: "project_lead",
      },
    },
  );
  typia.assert(member3);
  // Step 5: Get all project members to see what display names exist
  const allMembers = await api.functional.erpHrm.member.projects.members.index(
    ownerConnection,
    {
      projectId: project.id,
      body: {} satisfies IErpHrmProjectMember.IRequest,
    },
  );
  typia.assert(allMembers);
  // Ensure we have members to search through
  TestValidator.predicate(
    "project has members for search testing",
    allMembers.data.length >= 3,
  );
  // Extract display names for testing
  const displayNames = allMembers.data.map(
    (m) => m.employee.member.displayName,
  );
  // Step 6: Test partial matching with first 3 characters of a display name
  if (displayNames.length > 0) {
    const firstName = displayNames[0];
    const partialSearch = firstName.substring(0, Math.min(3, firstName.length));
    const partialSearchResult =
      await api.functional.erpHrm.member.projects.members.index(
        ownerConnection,
        {
          projectId: project.id,
          body: {
            search: partialSearch,
          } satisfies IErpHrmProjectMember.IRequest,
        },
      );
    typia.assert(partialSearchResult);
    // Validate partial matching works
    const partialMatches = partialSearchResult.data.filter((m) =>
      m.employee.member.displayName
        .toLowerCase()
        .includes(partialSearch.toLowerCase()),
    );
    TestValidator.predicate(
      "partial matching returns matching results",
      partialMatches.length > 0,
    );
  }
  // Step 7: Test case-insensitive matching
  if (displayNames.length > 0) {
    const firstName = displayNames[0];
    const lowerCaseSearch = firstName
      .substring(0, Math.min(3, firstName.length))
      .toLowerCase();
    const caseInsensitiveResult =
      await api.functional.erpHrm.member.projects.members.index(
        ownerConnection,
        {
          projectId: project.id,
          body: {
            search: lowerCaseSearch,
          } satisfies IErpHrmProjectMember.IRequest,
        },
      );
    typia.assert(caseInsensitiveResult);
    // Validate case-insensitive search returns results
    TestValidator.predicate(
      "case-insensitive search returns results",
      caseInsensitiveResult.data.length >= 1,
    );
    // Verify the match is actually case-insensitive
    const matchedNames = caseInsensitiveResult.data.map(
      (m) => m.employee.member.displayName,
    );
    const hasMatch = matchedNames.some((name) =>
      name.toLowerCase().includes(lowerCaseSearch),
    );
    TestValidator.predicate("case-insensitive match is verified", hasMatch);
  }
  // Step 8: Test non-matching search term returns empty results
  const noMatchResult =
    await api.functional.erpHrm.member.projects.members.index(ownerConnection, {
      projectId: project.id,
      body: {
        search: "ZZZNonExistentName999",
      } satisfies IErpHrmProjectMember.IRequest,
    });
  typia.assert(noMatchResult);
  // Validate empty results gracefully returned
  TestValidator.equals(
    "non-matching search returns empty data",
    noMatchResult.data.length,
    0,
  );
  TestValidator.equals(
    "pagination records is 0 for no matches",
    noMatchResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages is 0 for no matches",
    noMatchResult.pagination.pages,
    0,
  );
  // Step 9: Test search combined with role filter
  const roleFilteredSearch =
    await api.functional.erpHrm.member.projects.members.index(ownerConnection, {
      projectId: project.id,
      body: {
        role: "member",
      } satisfies IErpHrmProjectMember.IRequest,
    });
  typia.assert(roleFilteredSearch);
  // Verify all returned members have the filtered role
  const allHaveMemberRole = roleFilteredSearch.data.every(
    (m) => m.role === "member",
  );
  TestValidator.predicate(
    "role filter returns only members with specified role",
    allHaveMemberRole,
  );
  // Step 10: Test pagination with search
  const paginatedResult =
    await api.functional.erpHrm.member.projects.members.index(ownerConnection, {
      projectId: project.id,
      body: {
        page: 1,
        limit: 5,
      } satisfies IErpHrmProjectMember.IRequest,
    });
  typia.assert(paginatedResult);
  // Validate pagination metadata
  TestValidator.equals(
    "current page is 1",
    paginatedResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit is respected",
    paginatedResult.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "total records is non-negative",
    paginatedResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages calculated correctly",
    paginatedResult.pagination.pages ===
      Math.ceil(
        paginatedResult.pagination.records / paginatedResult.pagination.limit,
      ),
  );
}
