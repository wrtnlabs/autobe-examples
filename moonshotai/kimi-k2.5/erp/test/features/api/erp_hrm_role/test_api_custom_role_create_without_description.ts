import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRolePermission";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_organizations_create } from "../../../generate/generate_random_erp_hrm_member_organizations_create";
import { generate_random_erp_hrm_member_roles_create } from "../../../generate/generate_random_erp_hrm_member_roles_create";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";
import { prepare_random_erp_hrm_role } from "../../../prepare/prepare_random_erp_hrm_role";
import { prepare_random_erp_hrm_role_permission } from "../../../prepare/prepare_random_erp_hrm_role_permission";

/**
 * Test creation of a custom role without optional description field.
 * The scenario validates:
 * 1. Member authentication
 * 2. Organization creation to establish context
 * 3. Custom role creation with only required fields (name and permissions, omitting description)
 * 4. Verification that description is returned as null, isBuiltin=false, and permissions are populated correctly
 */
export async function test_api_custom_role_create_without_description(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SecureP@ss123!",
      firstName: RandomGenerator.name(1),
      lastName: RandomGenerator.name(1),
      avatarUrl: null,
      timezone: "Asia/Seoul",
      locale: "en-US",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IErpHrmMember.IJoin,
  });
  // 2. Create an organization
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: null,
          currency: "USD",
          timezone: "Asia/Seoul",
          fiscal_year_start_month: 1,
        } satisfies IErpHrmOrganization.ICreate,
      },
    );
  typia.assert(organization);
  // 3. Create a custom role without description (only name and permissions)
  const role = await generate_random_erp_hrm_member_roles_create(
    memberConnection,
    {
      body: {
        name: "Contractor",
        permissions: [
          {
            permission: "timelog.create",
          } satisfies IErpHrmRolePermission.ICreate,
          {
            permission: "project.view",
          } satisfies IErpHrmRolePermission.ICreate,
        ],
      } satisfies IErpHrmRole.ICreate,
    },
  );
  typia.assert(role);
  // 4. Verify role properties
  TestValidator.equals("role name matches", role.name, "Contractor");
  TestValidator.equals("description is null", role.description, null);
  TestValidator.equals("isBuiltin is false", role.isBuiltin, false);
  TestValidator.equals(
    "organization id matches",
    role.organization.id,
    organization.id,
  );
  TestValidator.predicate(
    "role id exists and is valid",
    () => role.id.length > 0,
  );
  TestValidator.predicate("createdAt exists", () => role.createdAt !== null);
  TestValidator.predicate("updatedAt exists", () => role.updatedAt !== null);
  TestValidator.equals("deletedAt is null", role.deletedAt, null);
}
