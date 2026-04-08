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

export async function test_api_role_list_search_by_name_pattern(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member user
  const memberConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(auth);
  // Get organization ID from auth response
  const organizationId = auth.organizations?.[0]?.id;
  if (!organizationId) {
    throw new Error("No organization found in auth response");
  }
  // 2. Test searching roles with partial name pattern 'manag'
  // Should match 'Manager' built-in role
  const partialSearch =
    await api.functional.hrm.member.organizations.roles.index(
      memberConnection,
      {
        organizationId,
        body: {
          name: "manag",
          organization_id: organizationId,
        } satisfies IHrmRole.IRequest,
      },
    );
  typia.assert(partialSearch);
  // Validate results contain roles matching the pattern
  TestValidator.predicate(
    "partial search 'manag' should return matching roles",
    partialSearch.data.some((role) =>
      role.name.toLowerCase().includes("manag"),
    ),
  );
  // 3. Test with empty name filter (should return all roles)
  const allRoles = await api.functional.hrm.member.organizations.roles.index(
    memberConnection,
    {
      organizationId,
      body: {
        name: "",
        organization_id: organizationId,
      } satisfies IHrmRole.IRequest,
    },
  );
  typia.assert(allRoles);
  TestValidator.predicate(
    "empty name filter should return all roles",
    allRoles.data.length > 0,
  );
  // 4. Test with whitespace-only name filter (should return all roles)
  const whitespaceSearch =
    await api.functional.hrm.member.organizations.roles.index(
      memberConnection,
      {
        organizationId,
        body: {
          name: "   ",
          organization_id: organizationId,
        } satisfies IHrmRole.IRequest,
      },
    );
  typia.assert(whitespaceSearch);
  TestValidator.predicate(
    "whitespace-only name filter should return all roles",
    whitespaceSearch.data.length > 0,
  );
  // 5. Validate results are ordered alphabetically by name
  const names = allRoles.data.map((r) => r.name);
  const sortedNames = [...names].sort();
  TestValidator.equals(
    "results should be ordered alphabetically by name",
    names,
    sortedNames,
  );
  // 6. Test searching for 'own' should match 'Owner'
  const ownerSearch = await api.functional.hrm.member.organizations.roles.index(
    memberConnection,
    {
      organizationId,
      body: {
        name: "own",
        organization_id: organizationId,
      } satisfies IHrmRole.IRequest,
    },
  );
  typia.assert(ownerSearch);
  TestValidator.predicate(
    "partial search 'own' should return Owner role",
    ownerSearch.data.some((role) => role.name.toLowerCase().includes("own")),
  );
  // 7. Test searching for 'empl' should match 'Employee'
  const employeeSearch =
    await api.functional.hrm.member.organizations.roles.index(
      memberConnection,
      {
        organizationId,
        body: {
          name: "empl",
          organization_id: organizationId,
        } satisfies IHrmRole.IRequest,
      },
    );
  typia.assert(employeeSearch);
  TestValidator.predicate(
    "partial search 'empl' should return Employee role",
    employeeSearch.data.some((role) =>
      role.name.toLowerCase().includes("empl"),
    ),
  );
}