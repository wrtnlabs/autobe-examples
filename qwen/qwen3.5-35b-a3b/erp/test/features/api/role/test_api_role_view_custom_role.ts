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

export async function test_api_role_view_custom_role(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member and organization
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
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
  typia.assert(joinResult);
  // 2. Test role view endpoint
  // Note: Since role creation/listing endpoints are not available in SDK,
  // we test with a generated UUID to validate endpoint structure
  const roleConnection: api.IConnection = { host: connection.host };
  const roleId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const role = await api.functional.hrmPlatform.member.roles.at(
    roleConnection,
    {
      roleId,
    },
  );
  typia.assert(role);
  // 3. Validate role entity structure
  TestValidator.notEquals("role id is valid UUID", role.id, "");
  TestValidator.notEquals("role name exists", role.name, "");
  TestValidator.notEquals("role description exists", role.description, "");
  TestValidator.notEquals("role_kind is set", role.role_kind, "");
  TestValidator.notEquals(
    "organization name exists",
    role.organization.name,
    "",
  );
  TestValidator.notEquals("organization id exists", role.organization.id, "");
  TestValidator.predicate(
    "permissions array is valid",
    Array.isArray(role.permissions),
  );
  TestValidator.notEquals("created_at is set", role.created_at, "");
  TestValidator.notEquals("updated_at is set", role.updated_at, "");
  TestValidator.equals("deleted_at is null", role.deleted_at, null);
  // 4. Validate permission structure if permissions exist
  if (role.permissions.length > 0) {
    const permission = role.permissions[0];
    TestValidator.notEquals("permission id is valid UUID", permission.id, "");
    TestValidator.notEquals("permission code exists", permission.code, "");
    // Permission description can be null or string
    TestValidator.predicate(
      "permission description is valid type",
      permission.description === null ||
        typeof permission.description === "string",
    );
  }
}
