import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import type { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import type { IHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationMember";
import type { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmsOrganizationMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_organization_member_retrieval_empty_results(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member
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
  // 2. Test with non-matching search term
  const nonMatchingSearch = `XYZ${RandomGenerator.alphaNumeric(12)}SEARCH`;
  const emptySearchResult =
    await api.functional.hrms.member.organization_members.index(
      memberConnection,
      {
        body: {
          search: nonMatchingSearch,
          limit: 20,
        } satisfies IHrmsOrganizationMember.IRequest,
      },
    );
  typia.assert(emptySearchResult);
  // Validate empty search result structure
  TestValidator.equals("empty search has no data", emptySearchResult.data, []);
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
  TestValidator.equals(
    "empty search has valid current page",
    emptySearchResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "empty search has valid limit",
    emptySearchResult.pagination.limit,
    20,
  );
  // 3. Test with non-existent role_id
  const nonExistentRoleId = typia.random<string & tags.Format<"uuid">>();
  const emptyRoleResult =
    await api.functional.hrms.member.organization_members.index(
      memberConnection,
      {
        body: {
          role_id: nonExistentRoleId,
          limit: 20,
        } satisfies IHrmsOrganizationMember.IRequest,
      },
    );
  typia.assert(emptyRoleResult);
  // Validate empty role filter result structure
  TestValidator.equals(
    "empty role filter has no data",
    emptyRoleResult.data,
    [],
  );
  TestValidator.equals(
    "empty role filter has zero records",
    emptyRoleResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty role filter has zero pages",
    emptyRoleResult.pagination.pages,
    0,
  );
  TestValidator.equals(
    "empty role filter has valid current page",
    emptyRoleResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "empty role filter has valid limit",
    emptyRoleResult.pagination.limit,
    20,
  );
}
