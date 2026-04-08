import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberEmailVerification";
import type { IHrmPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberPasswordReset";
import type { IHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberSession";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformPermission";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_role_view_builtin_role(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member and organization
  const memberConnection: api.IConnection = { host: connection.host };
  const joinOutput = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      org_name: RandomGenerator.name(),
      org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
      org_description: RandomGenerator.paragraph(),
      org_logo_uri: typia.random<string & tags.Format<"uri">>(),
      org_timezone: RandomGenerator.pick([
        "UTC",
        "Asia/Seoul",
        "America/New_York",
      ]),
      org_fiscal_month: RandomGenerator.pick([1, 4, 7, 10]) as
        | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>)
        | undefined,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(joinOutput);
  // 2. Owner role UUID - use generated UUID (in real scenario, would obtain from system)
  const ownerRoleId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. View the Owner role (memberConnection has token from authorize_member_join)
  const role = await api.functional.hrmPlatform.member.roles.at(
    memberConnection,
    {
      roleId: ownerRoleId,
    },
  );
  typia.assert(role);
  // 4. Validate role_kind is 'owner' for built-in Owner role
  TestValidator.equals("role_kind is owner", role.role_kind, "owner");
  // 5. Validate all required fields exist and have correct types
  TestValidator.predicate("has valid id", role.id !== undefined);
  TestValidator.predicate("has name", role.name.length > 0);
  TestValidator.predicate("has description", role.description !== undefined);
  TestValidator.predicate("has organization", role.organization !== undefined);
  TestValidator.predicate(
    "has permissions array",
    Array.isArray(role.permissions),
  );
  // 6. Validate timestamps are properly formatted ISO date-time strings
  TestValidator.predicate(
    "created_at is valid ISO date-time",
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/.test(role.created_at),
  );
  TestValidator.predicate(
    "updated_at is valid ISO date-time",
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/.test(role.updated_at),
  );
  // 7. Validate built-in roles cannot be deleted (deleted_at should be NULL)
  TestValidator.equals("built-in role not deleted", role.deleted_at, null);
  // 8. Validate organization context is correctly linked
  typia.assert(role.organization);
  TestValidator.equals(
    "organization has id",
    role.organization.id !== undefined,
    true,
  );
  TestValidator.equals(
    "organization has name",
    role.organization.name.length > 0,
    true,
  );
  // 9. Validate permissions array has items
  TestValidator.predicate(
    "permissions array has items",
    role.permissions.length > 0,
  );
  // 10. Validate each permission has required fields
  for (const permission of role.permissions) {
    typia.assert(permission);
    TestValidator.predicate("permission has id", permission.id !== undefined);
    TestValidator.predicate(
      "permission has code",
      permission.code !== undefined,
    );
    TestValidator.predicate(
      "permission has description",
      permission.description !== null,
    );
  }
}
