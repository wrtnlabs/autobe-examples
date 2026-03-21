import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_roles_create } from "../../../generate/generate_random_erp_hrm_member_roles_create";
import { prepare_random_erp_hrm_role } from "../../../prepare/prepare_random_erp_hrm_role";

export async function test_api_role_creation_without_permissions(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new member connection and authenticate via join
  // When a member joins, they create their first organization and become the owner
  // with full permissions including org:manage
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(authorized);
  // 2. Create a custom role with an empty permissions array
  const roleName = RandomGenerator.name();
  const role = await api.functional.erpHrm.member.roles.create(
    memberConnection,
    {
      body: {
        name: roleName,
        permissions: [],
      } satisfies IErpHrmRole.ICreate,
    },
  );
  typia.assert(role);
  // 3. Validate the created role properties
  TestValidator.equals("role name matches", role.name, roleName);
  TestValidator.equals("permissions array is empty", role.permissions, []);
  TestValidator.equals("role is custom (not builtin)", role.is_builtin, false);
  TestValidator.predicate(
    "role has valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      role.id,
    ),
  );
  TestValidator.predicate(
    "created_at is valid ISO date string",
    !isNaN(Date.parse(role.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid ISO date string",
    !isNaN(Date.parse(role.updated_at)),
  );
  TestValidator.equals("deleted_at is null", role.deleted_at, null);
  TestValidator.predicate("organization exists", role.organization !== null);
}
