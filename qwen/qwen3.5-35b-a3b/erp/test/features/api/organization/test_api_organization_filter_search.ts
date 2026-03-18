import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import type { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import type { IHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationMember";
import type { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmsOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_organization_filter_search(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmsMember.IJoin,
  });
  typia.assert(member);
  // 2. Use member's own connection to query organizations
  // After registration, the connection has the token in headers from authorize_member_join
  const orgConnection: api.IConnection = {
    host: connection.host,
    headers: memberConnection.headers,
  };
  // 3. Test name search: search for term that matches some organizations
  let result = await api.functional.hrms.member.organizations.index(
    orgConnection,
    {
      body: { search: "corp" },
    },
  );
  typia.assert(result);
  TestValidator.equals(
    "search 'corp' returns paginated results",
    result.pagination.records,
    result.data.length,
  );
  TestValidator.predicate(
    "results are non-negative",
    result.pagination.records >= 0,
  );
  // 4. Test currency filter
  result = await api.functional.hrms.member.organizations.index(orgConnection, {
    body: { currency: "USD" },
  });
  typia.assert(result);
  TestValidator.equals(
    "currency filter metadata accurate",
    result.pagination.records,
    result.data.length,
  );
  // 5. Test timezone filter
  result = await api.functional.hrms.member.organizations.index(orgConnection, {
    body: { timezone: "Asia/Seoul" },
  });
  typia.assert(result);
  TestValidator.equals(
    "timezone filter metadata accurate",
    result.pagination.records,
    result.data.length,
  );
  // 6. Test combined filters
  result = await api.functional.hrms.member.organizations.index(orgConnection, {
    body: { search: "corp", currency: "USD" },
  });
  typia.assert(result);
  TestValidator.equals(
    "combined filter metadata accurate",
    result.pagination.records,
    result.data.length,
  );
  // 7. Test empty search (no filter) - returns all organizations
  result = await api.functional.hrms.member.organizations.index(orgConnection, {
    body: {},
  });
  typia.assert(result);
  TestValidator.predicate(
    "empty search returns all organizations",
    result.pagination.records >= 0,
  );
  // 8. Test non-existent search term
  result = await api.functional.hrms.member.organizations.index(orgConnection, {
    body: { search: "nonexistentterminotfound" },
  });
  typia.assert(result);
  TestValidator.equals(
    "non-existent search returns empty",
    result.data.length,
    0,
  );
  TestValidator.equals(
    "non-existent search pagination accurate",
    result.pagination.records,
    0,
  );
}
