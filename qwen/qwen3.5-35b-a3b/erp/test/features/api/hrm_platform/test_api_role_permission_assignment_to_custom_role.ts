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

export async function test_api_role_permission_assignment_to_custom_role(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register as member user to create organization and get Owner role
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      org_name: RandomGenerator.name(),
      org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(joinResult);
  // 2. Create connection with the token from registration for authorization
  const authorizedConnection: api.IConnection = { host: connection.host };
  authorizedConnection.headers = { Authorization: joinResult.token.access };
  // Note: The member summary (ISummary) doesn't include roles or organization information,
  // so we cannot retrieve the Owner role ID from the API response.
  // In a complete implementation, there would be a GET /roles endpoint or similar
  // to list roles within the organization.
  // Using a placeholder UUID for demonstration - would need real role ID from actual API
  const ownerRoleId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Create a permission and assign it to the role
  // Note: Permission codes follow dot notation (e.g., 'project.view', 'employee.manage')
  const permissionBody = {
    code: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 2,
      wordMax: 4,
    }).replace(/\s+/g, "."),
    description: RandomGenerator.paragraph({ sentences: 1 }),
  } satisfies IHrmPlatformRole.IPermissionCreate;
  const permission =
    await api.functional.hrmPlatform.member.roles.permissions.create(
      authorizedConnection,
      {
        roleId: ownerRoleId,
        body: permissionBody,
      },
    );
  typia.assert(permission);
  // 4. Validate the permission was created correctly
  TestValidator.equals(
    "permission code matches input",
    permission.code,
    permissionBody.code,
  );
  TestValidator.equals(
    "permission description matches input",
    permission.description,
    permissionBody.description,
  );
  TestValidator.notEquals(
    "created_at timestamp is set",
    permission.created_at,
    null,
  );
  TestValidator.notEquals(
    "updated_at timestamp is set",
    permission.updated_at,
    null,
  );
  TestValidator.equals(
    "deleted_at is null for active permission",
    permission.deleted_at,
    null,
  );
  // 5. Verify the permission belongs to the correct role
  TestValidator.equals(
    "permission role_id matches input",
    permission.role.id,
    ownerRoleId,
  );
}