import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import type { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import type { IHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationMember";
import type { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmsOrganization";
import type { IPageIHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmsOrganizationRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrms_member_organization_members_create } from "../../../generate/generate_random_hrms_member_organization_members_create";
import { generate_random_hrms_member_organizations_roles_create } from "../../../generate/generate_random_hrms_member_organizations_roles_create";
import { prepare_random_hrms_organization_member } from "../../../prepare/prepare_random_hrms_organization_member";
import { prepare_random_hrms_organization_role } from "../../../prepare/prepare_random_hrms_organization_role";

export async function test_api_organization_roles_sort_and_search(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(member);
  // 2. List organizations to get a valid organizationId
  const orgConnection: api.IConnection = { host: connection.host };
  orgConnection.headers = { Authorization: member.token.access };
  const orgList = await api.functional.hrms.member.organizations.index(
    orgConnection,
    {
      body: {},
    },
  );
  typia.assert(orgList);
  TestValidator.predicate(
    "organization list not empty",
    orgList.data.length > 0,
  );
  const organizationId = orgList.data[0].id;
  // 3. Create multiple custom roles with different names for sorting tests
  const role1 = await api.functional.hrms.member.organizations.roles.create(
    orgConnection,
    {
      organizationId,
      body: {
        name: "Employee",
      },
    },
  );
  typia.assert(role1);
  const role2 = await api.functional.hrms.member.organizations.roles.create(
    orgConnection,
    {
      organizationId,
      body: {
        name: "Manager",
      },
    },
  );
  typia.assert(role2);
  const role3 = await api.functional.hrms.member.organizations.roles.create(
    orgConnection,
    {
      organizationId,
      body: {
        name: "Project Manager",
      },
    },
  );
  typia.assert(role3);
  const role4 = await api.functional.hrms.member.organizations.roles.create(
    orgConnection,
    {
      organizationId,
      body: {
        name: "Admin",
      },
    },
  );
  typia.assert(role4);
  const role5 = await api.functional.hrms.member.organizations.roles.create(
    orgConnection,
    {
      organizationId,
      body: {
        name: "Guest",
      },
    },
  );
  typia.assert(role5);
  // 4. Test name sorting ascending (sort='name')
  const nameAscResult =
    await api.functional.hrms.member.organizations.roles.index(orgConnection, {
      organizationId,
      body: {
        sort: "name",
        limit: 20,
        page: 1,
      },
    });
  typia.assert(nameAscResult);
  // Verify roles are sorted alphabetically by name in ascending order
  const roleNamesAsc = nameAscResult.data.map((r) => r.name);
  const sortedNamesAsc = [...roleNamesAsc].sort();
  TestValidator.equals("name sorting ascending", roleNamesAsc, sortedNamesAsc);
  // 5. Test name sorting descending (sort='-name')
  const nameDescResult =
    await api.functional.hrms.member.organizations.roles.index(orgConnection, {
      organizationId,
      body: {
        sort: "-name",
        limit: 20,
        page: 1,
      },
    });
  typia.assert(nameDescResult);
  const roleNamesDesc = nameDescResult.data.map((r) => r.name);
  const sortedNamesDesc = [...roleNamesAsc].sort().reverse();
  TestValidator.equals(
    "name sorting descending",
    roleNamesDesc,
    sortedNamesDesc,
  );
  // 6. Test created_at sorting ascending (sort='created_at')
  const createdAtAscResult =
    await api.functional.hrms.member.organizations.roles.index(orgConnection, {
      organizationId,
      body: {
        sort: "created_at",
        limit: 20,
        page: 1,
      },
    });
  typia.assert(createdAtAscResult);
  const createdAtValues = createdAtAscResult.data.map((r) => r.created_at);
  const sortedCreatedAt = [...createdAtValues].sort();
  TestValidator.equals(
    "created_at sorting ascending",
    createdAtValues,
    sortedCreatedAt,
  );
  // 7. Test name search filter with partial match (search='Manager')
  const searchManagerResult =
    await api.functional.hrms.member.organizations.roles.index(orgConnection, {
      organizationId,
      body: {
        search: "Manager",
        limit: 20,
        page: 1,
      },
    });
  typia.assert(searchManagerResult);
  // Verify all returned roles have 'Manager' in their name (case-insensitive)
  const managerRoleNames = searchManagerResult.data.map((r) => r.name);
  const hasNoMatch = managerRoleNames.some(
    (name) => !name.toLowerCase().includes("manager"),
  );
  TestValidator.predicate("all roles contain Manager in name", !hasNoMatch);
  // 8. Test combined filters (sort + is_builtin + search)
  const combinedResult =
    await api.functional.hrms.member.organizations.roles.index(orgConnection, {
      organizationId,
      body: {
        sort: "name",
        is_builtin: false,
        search: "Admin",
        limit: 20,
        page: 1,
      },
    });
  typia.assert(combinedResult);
  // Verify results are filtered to only custom roles (is_builtin=false)
  const allCustom = combinedResult.data.every((r) => r.is_builtin === false);
  TestValidator.predicate("all roles are custom (not built-in)", allCustom);
  // Verify results contain only roles with 'Admin' in the name
  const adminNames = combinedResult.data.map((r) => r.name);
  const hasNoAdminMatch = adminNames.some(
    (name) => !name.toLowerCase().includes("admin"),
  );
  TestValidator.predicate("all roles contain Admin in name", !hasNoAdminMatch);
  // Verify results are sorted alphabetically
  const sortedAdminNames = [...adminNames].sort();
  TestValidator.equals(
    "admin roles sorted by name",
    adminNames,
    sortedAdminNames,
  );
  // 9. Test empty search results
  const emptySearchResult =
    await api.functional.hrms.member.organizations.roles.index(orgConnection, {
      organizationId,
      body: {
        search: "NonExistentRoleName123",
        limit: 20,
        page: 1,
      },
    });
  typia.assert(emptySearchResult);
  TestValidator.equals(
    "empty search returns empty data array",
    emptySearchResult.data.length,
    0,
  );
  TestValidator.equals(
    "empty search has zero records",
    emptySearchResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty search has zero pages",
    emptySearchResult.pagination.pages,
    0,
  );
}
