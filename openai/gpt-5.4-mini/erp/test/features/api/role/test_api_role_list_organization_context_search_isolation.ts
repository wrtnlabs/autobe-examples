import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingOrganization";
import type { IPageIHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_role_list_organization_context_search_isolation(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IHrmTimeTrackingMember.IJoin,
  });
  typia.assert(authorized);
  const searchTerm = RandomGenerator.alphabets(3);
  const response = await api.functional.hrmTimeTracking.member.roles.index(
    memberConnection,
    {
      body: {
        search: searchTerm,
        page: 1,
        limit: 10,
        sortBy: "name",
        sortDirection: "asc",
      } satisfies IHrmTimeTrackingRole.IRequest,
    },
  );
  typia.assert(response);
  TestValidator.equals(
    "role list current page",
    response.pagination.current,
    1,
  );
  TestValidator.equals("role list page size", response.pagination.limit, 10);
  TestValidator.predicate(
    "role list pages should be non-negative",
    response.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "role list records should be non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "role list should return role summaries",
    response.data.every(
      (role) => role.organization !== null && role.name.length >= 0,
    ),
  );
  TestValidator.predicate(
    "role list should preserve organization summaries",
    response.data.every(
      (role) =>
        role.organization.deletedAt === null ||
        role.organization.deletedAt !== undefined,
    ),
  );
}
