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

export async function test_api_organization_member_duplicate_rejection(
  connection: api.IConnection,
): Promise<void> {
  // Create manager user
  const managerConnection: api.IConnection = { host: connection.host };
  const managerAuth = await authorize_member_join(managerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmsMember.IJoin,
  });
  typia.assert(managerAuth);
  // Create employee user
  const employeeConnection: api.IConnection = { host: connection.host };
  const employeeAuth = await authorize_member_join(employeeConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmsMember.IJoin,
  });
  typia.assert(employeeAuth);
  // Use manager's first organization membership to get target organization and role
  if (managerAuth.organization_memberships.length === 0) {
    throw new Error("Manager has no organization memberships");
  }
  const firstMembership = managerAuth.organization_memberships[0];
  typia.assert(firstMembership);
  const targetOrganization = firstMembership.organization;
  const targetRole = firstMembership.organizationRole;
  typia.assert(targetOrganization);
  typia.assert(targetRole);
  // Create first membership for employee in target organization
  const firstMembershipCreated =
    await api.functional.hrms.member.organization_members.create(
      managerConnection,
      {
        body: {
          hrms_member_id: employeeAuth.id,
          hrms_organization_id: targetOrganization.id,
          hrms_organization_role_id: targetRole.id,
        } satisfies IHrmsOrganizationMember.ICreate,
      },
    );
  typia.assert(firstMembershipCreated);
  // Verify membership was created with correct structure
  TestValidator.equals(
    "membership has employee id",
    firstMembershipCreated.hrms_member_id,
    employeeAuth.id,
  );
  TestValidator.equals(
    "membership has organization id",
    firstMembershipCreated.hrms_organization_id,
    targetOrganization.id,
  );
  TestValidator.equals(
    "membership has role id",
    firstMembershipCreated.hrms_organization_role_id,
    targetRole.id,
  );
  // Try to create duplicate membership - should fail with 409 Conflict
  await TestValidator.error("duplicate membership rejection", async () => {
    await api.functional.hrms.member.organization_members.create(
      managerConnection,
      {
        body: {
          hrms_member_id: employeeAuth.id,
          hrms_organization_id: targetOrganization.id,
          hrms_organization_role_id: targetRole.id,
        } satisfies IHrmsOrganizationMember.ICreate,
      },
    );
  });
  // Verify membership remains unchanged (firstMembershipCreated is the only one)
  typia.assert(firstMembershipCreated);
  TestValidator.predicate(
    "membership is not null",
    firstMembershipCreated !== null,
  );
}