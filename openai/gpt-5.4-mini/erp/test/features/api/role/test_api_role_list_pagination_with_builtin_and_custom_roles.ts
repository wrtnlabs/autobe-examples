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

export async function test_api_role_list_pagination_with_builtin_and_custom_roles(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IHrmTimeTrackingMember.IJoin,
  });
  typia.assert(member);
  const organizationConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: member.token.access,
    },
  };
  const organizations =
    await api.functional.hrmTimeTracking.member.organizations.index(
      organizationConnection,
      {
        body: {
          page: 1,
          limit: 10,
          sort: "createdAt",
          order: "asc",
        } satisfies IHrmTimeTrackingOrganization.IRequest,
      },
    );
  typia.assert(organizations);
  TestValidator.predicate(
    "member should have at least one accessible organization",
    organizations.data.length > 0,
  );
  const activeOrganization = organizations.data[0];
  const roleConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: member.token.access,
    },
  };
  const roles = await api.functional.hrmTimeTracking.member.roles.index(
    roleConnection,
    {
      body: {
        page: 1,
        limit: 20,
        sortBy: "name",
        sortDirection: "asc",
      } satisfies IHrmTimeTrackingRole.IRequest,
    },
  );
  typia.assert(roles);
  TestValidator.equals(
    "requested page should be returned",
    roles.pagination.current,
    1,
  );
  TestValidator.equals(
    "requested limit should be returned",
    roles.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "pagination records should be non-negative",
    roles.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be non-negative",
    roles.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "page size should not exceed requested limit",
    roles.data.length <= roles.pagination.limit,
  );
  TestValidator.predicate(
    "every role should belong to the active organization",
    roles.data.every((role) => role.organization.id === activeOrganization.id),
  );
  TestValidator.predicate(
    "response should include at least one built-in role",
    roles.data.some((role) => role.isBuiltin),
  );
  TestValidator.predicate(
    "response should include at least one custom role",
    roles.data.some((role) => !role.isBuiltin),
  );
  TestValidator.predicate(
    "role names should be sorted in ascending order",
    roles.data.every(
      (role, index, array) =>
        index === 0 || array[index - 1].name.localeCompare(role.name) <= 0,
    ),
  );
}
