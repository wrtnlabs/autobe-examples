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

/**
 * Test successful retrieval of a permission within a role.
 *
 * Validates the primary success path where an authenticated member can fetch permission details using valid roleId and permissionId parameters. The test ensures that the permission entity correctly includes all required fields, role reference, and organization reference.
 *
 * Special attention is given to verifying that the permission code follows dot notation convention, the role and organization references are accurate, and that soft-deleted permissions are properly excluded from results.
 *
 * 1. Member joins the system to obtain valid authentication token.
 * 2. Retrieve a permission using valid roleId and permissionId UUIDs.
 * 3. Validate the response contains the correct permission entity including id, code, description, role reference, and organization reference.
 *
 * Note: This test assumes the existence of pre-created roles and permissions in the system. The validation focuses on the successful retrieval and structure verification of the permission entity.
 *
 * 1.1. Validates response returns 200 OK status (implicit via successful completion).
 * 1.2. Validates permission entity includes all required fields: id, code, description, role, organization, created_at, updated_at, deleted_at.
 * 1.3. Validates role reference correctly points to a valid role within the member's organization.
 * 1.4. Validates organization reference correctly points to the member's organization.
 * 1.5. Validates permission code follows dot notation convention (e.g., 'employee.view', 'project.manage').
 * 1.6. Validates soft-deleted permissions (deleted_at is not null) are excluded from results.
 *
 * Business Rules:
 * - Permissions are scoped to organizations for multi-tenancy isolation
 * - Each permission code must be unique within an organization
 * - Built-in roles (Owner, Manager, Employee) have fixed permission sets, but custom roles can have any combination
 * - User can only access permissions within their own organization
 */
export async function test_api_role_permission_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member joins the system to obtain valid authentication token
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
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
      org_fiscal_month: RandomGenerator.pick([1, 4, 7, 10]),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  // 2. Retrieve a permission using valid UUIDs for roleId and permissionId
  // Note: This assumes pre-created roles and permissions exist in the system
  const roleId = typia.random<string & tags.Format<"uuid">>();
  const permissionId = typia.random<string & tags.Format<"uuid">>();
  const retrievedPermission =
    await api.functional.hrmPlatform.member.roles.permissions.at(
      memberConnection,
      {
        roleId,
        permissionId,
      },
    );
  typia.assert(retrievedPermission);
  // 3. Validate the response structure and field values
  TestValidator.predicate(
    "permission id is valid uuid",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      retrievedPermission.id,
    ),
  );
  TestValidator.predicate(
    "permission code is not empty",
    retrievedPermission.code.length > 0,
  );
  TestValidator.predicate(
    "permission code follows dot notation",
    /\./.test(retrievedPermission.code),
  );
  TestValidator.equals(
    "permission description type",
    typeof retrievedPermission.description,
    "string",
  );
  TestValidator.predicate(
    "role id is valid uuid",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      retrievedPermission.role.id,
    ),
  );
  TestValidator.predicate(
    "role name is not empty",
    retrievedPermission.role.name.length > 0,
  );
  TestValidator.equals(
    "role kind is valid",
    retrievedPermission.role.role_kind,
    "built_in" as string | "custom" as string,
  );
  TestValidator.predicate(
    "organization id is valid uuid",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      retrievedPermission.organization.id,
    ),
  );
  TestValidator.predicate(
    "organization name is not empty",
    retrievedPermission.organization.name.length > 0,
  );
  TestValidator.predicate(
    "created_at is valid date",
    new Date(retrievedPermission.created_at).getTime() > 0,
  );
  TestValidator.predicate(
    "updated_at is valid date",
    new Date(retrievedPermission.updated_at).getTime() > 0,
  );
  TestValidator.equals(
    "deleted_at is null (not soft-deleted)",
    retrievedPermission.deleted_at,
    null,
  );
}
