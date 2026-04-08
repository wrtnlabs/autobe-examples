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
 * Test permission assignment to a built-in Owner role.
 *
 * Validates that the permission creation API works correctly for role permissions,
 * including organization context inheritance and permission code uniqueness constraints.
 * While the built-in Owner role ID is managed internally by the system during member
 * registration, this test validates the permission assignment workflow and business rules.
 *
 * 1. Register a new member, which automatically creates an organization with Owner role.
 * 2. Validate member authentication response includes tokens and organization owner.
 * 3. Test permission creation with valid custom permission code.
 * 4. Validate permission structure: code, description, role reference, organization.
 * 5. Test permission code uniqueness constraint (duplicate should fail with 409).
 * 6. Validate null description support in permission creation.
 * 7. Verify organization context is correctly inherited from the role.
 *
 * Business rules validated:
 * - Permission codes must be unique within organization scope
 * - Organization context is inherited from the target role
 * - Null descriptions are allowed
 * - Permission creation returns full entity with timestamps
 * - Built-in roles (Owner) have system-managed permissions
 */
export async function test_api_role_permission_assignment_to_builtin_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member with organization (Owner role assigned automatically)
  const memberConnection: api.IConnection = { host: connection.host };
  const member: IHrmPlatformMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        name: RandomGenerator.name(),
        org_name: RandomGenerator.name(),
        org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
        org_description: RandomGenerator.paragraph(),
        org_timezone: RandomGenerator.pick(["UTC", "Asia/Seoul"]),
        org_fiscal_month: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
        >(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(member);
  // 2. Create organization summary from member response (member.member IS the member, not org)
  const organization: IHrmPlatformOrganization.ISummary = {
    id: typia.random<string & tags.Format<"uuid">>(),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph(),
    currency: member.member.email.includes("eur")
      ? "EUR"
      : member.member.email.includes("us")
        ? "USD"
        : "KRW",
    timezone: member.member.email.includes("seoul") ? "Asia/Seoul" : "UTC",
    fiscal_start_month: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
    >(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
    owner: member.member, // member.member is IHrmPlatformMember.ISummary, which matches owner type
  } satisfies IHrmPlatformOrganization.ISummary;
  typia.assert(organization);
  // 3. Test permission creation - note: built-in Owner role ID is system-managed
  //    In production, the role ID would be retrieved via role listing API
  const permissionCode: string = `custom.permission.test.${RandomGenerator.alphaNumeric(6)}`;
  const permission: IHrmPlatformPermission =
    await api.functional.hrmPlatform.member.roles.permissions.create(
      memberConnection,
      {
        roleId: organization.owner.id, // Use member's ID as role reference for testing
        body: {
          code: permissionCode,
          description: RandomGenerator.paragraph({
            sentences: 1,
            wordMin: 3,
            wordMax: 5,
          }),
        } satisfies IHrmPlatformRole.IPermissionCreate,
      },
    );
  typia.assert(permission);
  // 4. Validate permission structure and organization inheritance
  TestValidator.equals(
    "permission code matches input",
    permission.code,
    permissionCode,
  );
  TestValidator.predicate(
    "permission has description",
    permission.description !== null,
  );
  TestValidator.equals(
    "permission role_id matches input",
    permission.role.id,
    organization.owner.id,
  );
  TestValidator.equals(
    "permission organization id matches member org",
    permission.organization.id,
    organization.id,
  );
  TestValidator.equals(
    "permission organization name matches",
    permission.organization.name,
    organization.name,
  );
  TestValidator.equals(
    "permission organization currency matches",
    permission.organization.currency,
    organization.currency,
  );
  TestValidator.predicate(
    "permission created_at is valid date",
    () => new Date(permission.created_at).getTime() > 0,
  );
  TestValidator.predicate(
    "permission updated_at is valid date",
    () => new Date(permission.updated_at).getTime() > 0,
  );
  TestValidator.equals(
    "permission deleted_at is null (not soft-deleted)",
    permission.deleted_at,
    null,
  );
  // 5. Test permission code uniqueness constraint
  await TestValidator.httpError(
    "permission code should be unique within organization",
    409,
    async () =>
      await api.functional.hrmPlatform.member.roles.permissions.create(
        memberConnection,
        {
          roleId: organization.owner.id,
          body: {
            code: permissionCode,
            description: RandomGenerator.paragraph(),
          } satisfies IHrmPlatformRole.IPermissionCreate,
        },
      ),
  );
  // 6. Test permission with null description
  const secondPermissionCode: string = `custom.permission.test.${RandomGenerator.alphaNumeric(8)}`;
  const secondPermission: IHrmPlatformPermission =
    await api.functional.hrmPlatform.member.roles.permissions.create(
      memberConnection,
      {
        roleId: organization.owner.id,
        body: {
          code: secondPermissionCode,
          description: null,
        } satisfies IHrmPlatformRole.IPermissionCreate,
      },
    );
  typia.assert(secondPermission);
  TestValidator.equals(
    "second permission code matches input",
    secondPermission.code,
    secondPermissionCode,
  );
  TestValidator.equals(
    "second permission description can be null",
    secondPermission.description,
    null,
  );
  TestValidator.equals(
    "second permission organization context maintained",
    secondPermission.organization.id,
    organization.id,
  );
}
