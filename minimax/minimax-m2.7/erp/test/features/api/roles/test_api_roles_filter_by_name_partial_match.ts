import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_roles_filter_by_name_partial_match(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member to access the roles list endpoint
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IErpHrmMember.IJoin,
  });
  typia.assert(authorized);
  // 2. Get all roles first to establish baseline
  const allRolesResponse = await api.functional.erpHrm.member.roles.index(
    memberConnection,
    {
      body: {} satisfies IErpHrmRole.IRequest,
    },
  );
  typia.assert(allRolesResponse);
  // 3. Test partial name match filter with "man" (should match "Manager")
  const filteredResponse = await api.functional.erpHrm.member.roles.index(
    memberConnection,
    {
      body: {
        name: "man",
      } satisfies IErpHrmRole.IRequest,
    },
  );
  typia.assert(filteredResponse);
  // 4. Validate that all returned roles contain "man" in their name (case-insensitive)
  for (const role of filteredResponse.data) {
    TestValidator.predicate(
      `"man" filter matches role "${role.name}"`,
      role.name.toLowerCase().includes("man"),
    );
  }
  // 5. Verify total count reflects filtered results
  TestValidator.predicate(
    "filtered results count <= total roles count",
    filteredResponse.pagination.records <= allRolesResponse.pagination.records,
  );
  // 6. Test another partial match - "emp" (should match "Employee")
  const empFilteredResponse = await api.functional.erpHrm.member.roles.index(
    memberConnection,
    {
      body: {
        name: "emp",
      } satisfies IErpHrmRole.IRequest,
    },
  );
  typia.assert(empFilteredResponse);
  for (const role of empFilteredResponse.data) {
    TestValidator.predicate(
      `"emp" filter matches role "${role.name}"`,
      role.name.toLowerCase().includes("emp"),
    );
  }
  // 7. Test case-insensitive matching with uppercase filter
  const upperCaseFilteredResponse =
    await api.functional.erpHrm.member.roles.index(memberConnection, {
      body: {
        name: "MANAGER",
      } satisfies IErpHrmRole.IRequest,
    });
  typia.assert(upperCaseFilteredResponse);
  for (const role of upperCaseFilteredResponse.data) {
    TestValidator.predicate(
      `"MANAGER" (uppercase) filter matches role "${role.name}"`,
      role.name.toLowerCase().includes("manager"),
    );
  }
  // 8. Verify pagination works correctly with the name filter applied
  TestValidator.equals(
    "pagination structure is valid",
    filteredResponse.pagination.limit > 0,
    true,
  );
  TestValidator.equals(
    "current page is 1 or valid",
    filteredResponse.pagination.current >= 1,
    true,
  );
}
