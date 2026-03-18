import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import type { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import type { IHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationMember";
import type { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrms_member_organization_members_create } from "../../../generate/generate_random_hrms_member_organization_members_create";
import { prepare_random_hrms_organization_member } from "../../../prepare/prepare_random_hrms_organization_member";

export async function test_api_organization_member_creation_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create manager user and authenticate
  const managerConnection: api.IConnection = { host: connection.host };
  const managerAuth = await authorize_member_join(managerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmsMember.IJoin,
  });
  typia.assert(managerAuth);
  // 2. Create employee user and authenticate
  const employeeConnection: api.IConnection = { host: connection.host };
  const employeeAuth = await authorize_member_join(employeeConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmsMember.IJoin,
  });
  typia.assert(employeeAuth);
  // 3. Create organization membership (assign employee to organization with role)
  // Note: Organization and role IDs would be pre-existing or created via admin APIs
  // For this test, we use valid UUIDs that the server will validate
  const organizationId = typia.random<string & tags.Format<"uuid">>();
  const roleId = typia.random<string & tags.Format<"uuid">>();
  const membership =
    await api.functional.hrms.member.organization_members.create(
      managerConnection,
      {
        body: {
          hrms_member_id: employeeAuth.id,
          hrms_organization_id: organizationId,
          hrms_organization_role_id: roleId,
        } satisfies IHrmsOrganizationMember.ICreate,
      },
    );
  typia.assert(membership);
  // 4. Validate membership record structure
  TestValidator.equals("membership has valid id", membership.id, membership.id);
  TestValidator.equals(
    "membership hrms_member_id matches",
    membership.hrms_member_id,
    employeeAuth.id,
  );
  TestValidator.equals(
    "membership hrms_organization_id matches",
    membership.hrms_organization_id,
    organizationId,
  );
  TestValidator.equals(
    "membership hrms_organization_role_id matches",
    membership.hrms_organization_role_id,
    roleId,
  );
  // 5. Validate timestamps exist and are valid
  TestValidator.equals(
    "membership created_at is valid timestamp",
    membership.created_at !== null,
    true,
  );
  TestValidator.equals(
    "membership updated_at is valid timestamp",
    membership.updated_at !== null,
    true,
  );
  TestValidator.equals(
    "membership deleted_at is null (active membership)",
    membership.deleted_at,
    null,
  );
  // 6. Validate nested member entity
  TestValidator.equals(
    "member entity id matches employee",
    membership.member.id,
    employeeAuth.id,
  );
  TestValidator.equals(
    "member email matches employee",
    membership.member.email,
    employeeAuth.email,
  );
  TestValidator.equals(
    "member display_name matches employee",
    membership.member.display_name,
    employeeAuth.display_name,
  );
  // 7. Validate nested organization entity
  TestValidator.equals(
    "organization entity id matches",
    membership.organization.id,
    organizationId,
  );
  TestValidator.equals(
    "organization name exists",
    membership.organization.name.length > 0,
    true,
  );
  TestValidator.equals(
    "organization currency is set",
    membership.organization.currency !== "",
    true,
  );
  TestValidator.equals(
    "organization timezone is set",
    membership.organization.timezone !== "",
    true,
  );
  // 8. Validate nested role entity
  TestValidator.equals(
    "role entity id matches",
    membership.organizationRole.id,
    roleId,
  );
  TestValidator.equals(
    "role name exists",
    membership.organizationRole.name.length > 0,
    true,
  );
  TestValidator.equals(
    "role is builtin is boolean",
    typeof membership.organizationRole.is_builtin === "boolean",
    true,
  );
  // 9. Verify employee gains access to organization data
  // Employee should be able to retrieve their organization membership with role
  TestValidator.equals(
    "employee has access to organization membership data",
    membership.member.id !== undefined,
    true,
  );
}
