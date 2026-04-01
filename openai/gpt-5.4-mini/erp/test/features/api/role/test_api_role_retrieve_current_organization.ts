import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganization";
import type { IErpHrmTimePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimePermission";
import type { IErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_role_retrieve_current_organization(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      name: RandomGenerator.name(),
      href: "https://example.com/erp-hrm-time/member/join",
      referrer: "https://example.com/erp-hrm-time",
      ip: null,
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(authorized);
  const role = await api.functional.erpHrmTime.member.roles.at(
    memberConnection,
    {
      roleId: typia.random<string & tags.Format<"uuid">>(),
    },
  );
  typia.assert(role);
  TestValidator.predicate("role identifier is present", role.id.length > 0);
  TestValidator.predicate(
    "organization summary exists",
    role.organization !== null && role.organization !== undefined,
  );
  TestValidator.predicate("role name is present", role.name.length > 0);
  TestValidator.predicate(
    "role permissions list exists",
    Array.isArray(role.permissions),
  );
  TestValidator.predicate("createdAt is present", role.createdAt.length > 0);
  TestValidator.predicate("updatedAt is present", role.updatedAt.length > 0);
}
