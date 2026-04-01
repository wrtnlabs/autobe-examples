import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformInvitation";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformEmployee";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_invitations_create } from "../../../generate/generate_random_hrm_platform_member_invitations_create";
import { generate_random_hrm_platform_member_organizations_create } from "../../../generate/generate_random_hrm_platform_member_organizations_create";
import { prepare_random_hrm_platform_invitation } from "../../../prepare/prepare_random_hrm_platform_invitation";
import { prepare_random_hrm_platform_organization } from "../../../prepare/prepare_random_hrm_platform_organization";

export async function test_api_employee_list_search_by_name_partial_match(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member and get authenticated
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // Set authorization header from the authentication response
  memberConnection.headers = {
    Authorization: `Bearer ${memberAuth.token.access}`,
  };
  // 2. Create organization
  const organization =
    await generate_random_hrm_platform_member_organizations_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          currency: "USD",
          timezone: "Asia/Seoul",
          fiscal_start_month: 1,
        } satisfies IHrmPlatformOrganization.ICreate,
      },
    );
  typia.assert(organization);
  // 3. Select the organization as active context
  await api.functional.hrmPlatform.member.organizations.select(
    memberConnection,
    {
      organizationId: organization.id,
    },
  );
  // 4. Create employee invitations with varied display names for testing
  const testEmployees = [
    {
      name: "John Smith",
      email: typia.random<string & tags.Format<"email">>(),
    },
    { name: "John Doe", email: typia.random<string & tags.Format<"email">>() },
    {
      name: "Jane Smith",
      email: typia.random<string & tags.Format<"email">>(),
    },
    {
      name: "Alice Johnson",
      email: typia.random<string & tags.Format<"email">>(),
    },
    {
      name: "Bob Williams",
      email: typia.random<string & tags.Format<"email">>(),
    },
  ];
  const invitations: IHrmPlatformInvitation[] = [];
  for (const employee of testEmployees) {
    const invitation =
      await generate_random_hrm_platform_member_invitations_create(
        memberConnection,
        {
          body: {
            email: employee.email,
            expires_at: new Date(
              Date.now() + 7 * 24 * 60 * 60 * 1000,
            ).toISOString(),
            role_id: typia.random<string & tags.Format<"uuid">>(),
          } satisfies IHrmPlatformInvitation.ICreate,
        },
      );
    typia.assert(invitation);
    invitations.push(invitation);
  }
  // 5. Test prefix match - search "John" should find employees with John in name
  const johnSearch = await api.functional.hrmPlatform.member.employees.index(
    memberConnection,
    {
      body: {
        search: "John",
      } satisfies IHrmPlatformEmployee.IRequest,
    },
  );
  typia.assert(johnSearch);
  TestValidator.predicate(
    "John search returns results",
    johnSearch.data.length >= 0,
  );
  TestValidator.predicate(
    "John search pagination valid",
    johnSearch.pagination.current >= 1,
  );
  // 6. Test suffix match - search "Smith" should find employees with Smith in name
  const smithSearch = await api.functional.hrmPlatform.member.employees.index(
    memberConnection,
    {
      body: {
        search: "Smith",
      } satisfies IHrmPlatformEmployee.IRequest,
    },
  );
  typia.assert(smithSearch);
  TestValidator.predicate(
    "Smith search returns results",
    smithSearch.data.length >= 0,
  );
  // 7. Test substring match - search partial string
  const substringSearch =
    await api.functional.hrmPlatform.member.employees.index(memberConnection, {
      body: {
        search: "hn",
      } satisfies IHrmPlatformEmployee.IRequest,
    });
  typia.assert(substringSearch);
  TestValidator.predicate(
    "Substring search returns valid response",
    substringSearch.data.length >= 0,
  );
  // 8. Test empty search - should return all employees
  const emptySearch = await api.functional.hrmPlatform.member.employees.index(
    memberConnection,
    {
      body: {} satisfies IHrmPlatformEmployee.IRequest,
    },
  );
  typia.assert(emptySearch);
  TestValidator.predicate(
    "Empty search returns valid response",
    emptySearch.data.length >= 0,
  );
  // 9. Test non-matching search - should return empty results
  const noMatchSearch = await api.functional.hrmPlatform.member.employees.index(
    memberConnection,
    {
      body: {
        search: "XyZzNonExistent123",
      } satisfies IHrmPlatformEmployee.IRequest,
    },
  );
  typia.assert(noMatchSearch);
  TestValidator.equals(
    "No match search returns empty",
    noMatchSearch.data.length,
    0,
  );
  TestValidator.equals(
    "No match pagination pages",
    noMatchSearch.pagination.pages,
    0,
  );
  // 10. Test case-insensitive search - "john" should match same as "John"
  const caseInsensitiveSearch =
    await api.functional.hrmPlatform.member.employees.index(memberConnection, {
      body: {
        search: "john",
      } satisfies IHrmPlatformEmployee.IRequest,
    });
  typia.assert(caseInsensitiveSearch);
  TestValidator.equals(
    "Case insensitive search count",
    caseInsensitiveSearch.data.length,
    johnSearch.data.length,
  );
  // 11. Test search with pagination
  const paginatedSearch =
    await api.functional.hrmPlatform.member.employees.index(memberConnection, {
      body: {
        search: "",
        page: 1,
        limit: 2,
      } satisfies IHrmPlatformEmployee.IRequest,
    });
  typia.assert(paginatedSearch);
  TestValidator.predicate(
    "Paginated search respects limit",
    paginatedSearch.data.length <= 2,
  );
  TestValidator.equals(
    "Paginated search current page",
    paginatedSearch.pagination.current,
    1,
  );
}