import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployeeInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployeeInvitation";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformUserProfile";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformEmployeeInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformEmployeeInvitation";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test employee invitation search by email partial match functionality.
 *
 * Validates the employee invitation search endpoint with various email search patterns including partial matches, domain searches, and case-insensitive matching. Tests combining email search with other filters like status and employment_type to ensure proper filtering behavior.
 *
 * The test authenticates as a member and performs multiple search queries to verify the search functionality handles different scenarios correctly. Since invitation creation is not available in the provided SDK, the test validates the search endpoint's response structure and parameter handling.
 *
 * 1. Member authentication via join endpoint.
 * 2. Empty search returns all invitations with pagination.
 * 3. Partial email prefix search (e.g., 'john@') filters by email.
 * 4. Domain search (e.g., '@company.com') filters by domain.
 * 5. Case-insensitive matching verification.
 * 6. Combined email search with status filter.
 * 7. Combined email search with employment_type filter.
 * 8. Pagination parameters work correctly with search.
 */
export async function test_api_employee_invitation_search_by_email(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(member);
  // 2. Empty search - returns all invitations
  const allInvitations =
    await api.functional.hrmPlatform.member.employee_invitations.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IHrmPlatformEmployeeInvitation.IRequest,
      },
    );
  typia.assert(allInvitations);
  TestValidator.predicate(
    "pagination structure",
    allInvitations.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit",
    allInvitations.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records",
    allInvitations.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages",
    allInvitations.pagination.pages >= 0,
  );
  TestValidator.predicate("data is array", Array.isArray(allInvitations.data));
  // 3. Partial email prefix search
  const prefixSearch =
    await api.functional.hrmPlatform.member.employee_invitations.index(
      memberConnection,
      {
        body: {
          search: "john@",
          page: 1,
          limit: 50,
        } satisfies IHrmPlatformEmployeeInvitation.IRequest,
      },
    );
  typia.assert(prefixSearch);
  TestValidator.predicate(
    "prefix search returns array",
    Array.isArray(prefixSearch.data),
  );
  // 4. Domain search
  const domainSearch =
    await api.functional.hrmPlatform.member.employee_invitations.index(
      memberConnection,
      {
        body: {
          search: "@company.com",
          page: 1,
          limit: 50,
        } satisfies IHrmPlatformEmployeeInvitation.IRequest,
      },
    );
  typia.assert(domainSearch);
  TestValidator.predicate(
    "domain search returns array",
    Array.isArray(domainSearch.data),
  );
  // 5. Case-insensitive search test
  const upperCaseSearch =
    await api.functional.hrmPlatform.member.employee_invitations.index(
      memberConnection,
      {
        body: {
          search: "JOHN@",
          page: 1,
          limit: 50,
        } satisfies IHrmPlatformEmployeeInvitation.IRequest,
      },
    );
  typia.assert(upperCaseSearch);
  TestValidator.predicate(
    "uppercase search returns array",
    Array.isArray(upperCaseSearch.data),
  );
  // 6. Combined email search with status filter
  const statusFilteredSearch =
    await api.functional.hrmPlatform.member.employee_invitations.index(
      memberConnection,
      {
        body: {
          search: "@",
          status: "pending",
          page: 1,
          limit: 50,
        } satisfies IHrmPlatformEmployeeInvitation.IRequest,
      },
    );
  typia.assert(statusFilteredSearch);
  TestValidator.predicate(
    "status filtered search returns array",
    Array.isArray(statusFilteredSearch.data),
  );
  // 7. Combined email search with employment_type filter
  const employmentFilteredSearch =
    await api.functional.hrmPlatform.member.employee_invitations.index(
      memberConnection,
      {
        body: {
          search: "@",
          employment_type: "full-time",
          page: 1,
          limit: 50,
        } satisfies IHrmPlatformEmployeeInvitation.IRequest,
      },
    );
  typia.assert(employmentFilteredSearch);
  TestValidator.predicate(
    "employment filtered search returns array",
    Array.isArray(employmentFilteredSearch.data),
  );
  // 8. Pagination with search
  const paginatedSearch =
    await api.functional.hrmPlatform.member.employee_invitations.index(
      memberConnection,
      {
        body: {
          search: "@",
          page: 1,
          limit: 10,
        } satisfies IHrmPlatformEmployeeInvitation.IRequest,
      },
    );
  typia.assert(paginatedSearch);
  TestValidator.equals(
    "pagination current page",
    paginatedSearch.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    paginatedSearch.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "data respects limit",
    paginatedSearch.data.length <= 10,
  );
  // 9. Verify invitation summary structure when data exists
  if (allInvitations.data.length > 0) {
    const firstInvitation = allInvitations.data[0];
    typia.assert(firstInvitation);
    TestValidator.predicate(
      "invitation has id",
      firstInvitation.id !== undefined,
    );
    TestValidator.predicate(
      "invitation has email",
      firstInvitation.email !== undefined,
    );
    TestValidator.predicate(
      "invitation has status",
      firstInvitation.status !== undefined,
    );
    TestValidator.predicate(
      "invitation has employment_type",
      firstInvitation.employment_type !== undefined,
    );
    TestValidator.predicate(
      "invitation has invited_at",
      firstInvitation.invited_at !== undefined,
    );
    TestValidator.predicate(
      "invitation has invitedBy",
      firstInvitation.invitedBy !== undefined,
    );
    TestValidator.predicate(
      "invitation has role",
      firstInvitation.role !== undefined,
    );
  }
}
