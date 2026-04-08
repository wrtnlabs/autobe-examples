import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import type { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_role_list_filter_by_name_pattern(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Get organization context from member's organizations
  if (!memberAuth.organizations || memberAuth.organizations.length === 0) {
    throw new Error("Member has no organizations");
  }
  const organizationId = memberAuth.organizations[0].id;
  // 3. Test name filter with 'owner' (should match 'Owner' role - case insensitive)
  const ownerFiltered = await api.functional.hrm.member.roles.index(
    memberConnection,
    {
      body: {
        organization_id: organizationId,
        name: "owner",
      } satisfies IHrmRole.IRequest,
    },
  );
  typia.assert(ownerFiltered);
  // Validate that all returned roles contain 'owner' in their name (case-insensitive)
  for (const role of ownerFiltered.data) {
    TestValidator.predicate(
      `role name contains 'owner' (case-insensitive): ${role.name}`,
      role.name.toLowerCase().includes("owner"),
    );
  }
  TestValidator.predicate(
    "owner filter returns at least one role",
    ownerFiltered.data.length > 0,
  );
  // 4. Test name filter with 'manag' (should match 'Manager' role - case insensitive)
  const managerFiltered = await api.functional.hrm.member.roles.index(
    memberConnection,
    {
      body: {
        organization_id: organizationId,
        name: "manag",
      } satisfies IHrmRole.IRequest,
    },
  );
  typia.assert(managerFiltered);
  // Validate that all returned roles contain 'manag' in their name (case-insensitive)
  for (const role of managerFiltered.data) {
    TestValidator.predicate(
      `role name contains 'manag' (case-insensitive): ${role.name}`,
      role.name.toLowerCase().includes("manag"),
    );
  }
  TestValidator.predicate(
    "manag filter returns at least one role",
    managerFiltered.data.length > 0,
  );
  // 5. Test name filter with 'custom' (should match custom roles containing 'custom')
  const customFiltered = await api.functional.hrm.member.roles.index(
    memberConnection,
    {
      body: {
        organization_id: organizationId,
        name: "custom",
      } satisfies IHrmRole.IRequest,
    },
  );
  typia.assert(customFiltered);
  // Validate that all returned roles contain 'custom' in their name (case-insensitive)
  for (const role of customFiltered.data) {
    TestValidator.predicate(
      `role name contains 'custom' (case-insensitive): ${role.name}`,
      role.name.toLowerCase().includes("custom"),
    );
  }
  // 6. Test empty name filter (should return all roles)
  const allRolesEmptyFilter = await api.functional.hrm.member.roles.index(
    memberConnection,
    {
      body: {
        organization_id: organizationId,
        name: "",
      } satisfies IHrmRole.IRequest,
    },
  );
  typia.assert(allRolesEmptyFilter);
  TestValidator.predicate(
    "empty name filter returns roles",
    allRolesEmptyFilter.data.length > 0,
  );
  // 7. Test whitespace-only name filter (should return all roles)
  const allRolesWhitespaceFilter = await api.functional.hrm.member.roles.index(
    memberConnection,
    {
      body: {
        organization_id: organizationId,
        name: "   ",
      } satisfies IHrmRole.IRequest,
    },
  );
  typia.assert(allRolesWhitespaceFilter);
  TestValidator.predicate(
    "whitespace name filter returns roles",
    allRolesWhitespaceFilter.data.length > 0,
  );
  // 8. Verify empty/whitespace filters return same count as no filter
  const allRolesNoFilter = await api.functional.hrm.member.roles.index(
    memberConnection,
    {
      body: {
        organization_id: organizationId,
      } satisfies IHrmRole.IRequest,
    },
  );
  typia.assert(allRolesNoFilter);
  TestValidator.equals(
    "empty filter returns same count as no filter",
    allRolesEmptyFilter.data.length,
    allRolesNoFilter.data.length,
  );
  TestValidator.equals(
    "whitespace filter returns same count as no filter",
    allRolesWhitespaceFilter.data.length,
    allRolesNoFilter.data.length,
  );
}
