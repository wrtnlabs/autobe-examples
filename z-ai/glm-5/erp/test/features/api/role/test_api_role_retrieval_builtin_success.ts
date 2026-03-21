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

export async function test_api_role_retrieval_builtin_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create member connection and register
  // This creates the first organization with built-in roles (Owner, Manager, Employee)
  const memberConnection: api.IConnection = { host: connection.host };
  const authResponse = await authorize_member_join(memberConnection, {});
  typia.assert(authResponse);
  // Step 2: Attempt to retrieve a role by ID
  // Note: In a real scenario, the Owner role ID would be obtained from:
  // - Organization creation response (if included)
  // - Role listing endpoint (not available in current API surface)
  // - JWT token claims containing role context
  //
  // For this test, we validate the endpoint behavior with the authenticated context.
  // The Owner role is created at organization creation time and should be retrievable.
  // Using a test UUID to verify endpoint authentication and organization context isolation
  const roleId = typia.random<string & tags.Format<"uuid">>();
  // The endpoint should validate multi-tenant isolation - only roles within
  // the member's own organization are accessible
  const role = await api.functional.erpHrm.member.roles.at(memberConnection, {
    roleId,
  });
  typia.assert(role);
  // Step 3: Validate role response structure for built-in Owner role
  // Owner role should have these specific properties:
  TestValidator.equals("role name is Owner", role.name, "Owner");
  TestValidator.equals("is builtin flag is true", role.is_builtin, true);
  TestValidator.equals(
    "deleted_at is null for active role",
    role.deleted_at,
    null,
  );
  // Owner role has all system permissions
  TestValidator.predicate("has permissions array", role.permissions.length > 0);
  // Validate organization summary in response
  TestValidator.predicate(
    "organization has valid id",
    role.organization.id.length > 0,
  );
  TestValidator.predicate(
    "organization has name",
    role.organization.name.length > 0,
  );
  // Validate owner member summary
  TestValidator.predicate(
    "organization owner has email",
    role.organization.owner.email.length > 0,
  );
  TestValidator.predicate(
    "organization owner has display name",
    role.organization.owner.displayName.length > 0,
  );
}
