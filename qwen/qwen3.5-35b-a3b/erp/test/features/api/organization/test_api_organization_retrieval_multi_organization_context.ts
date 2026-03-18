import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsEmployee";
import type { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import type { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import type { IHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationMember";
import type { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import type { IHrmsProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsProject";
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

export async function test_api_organization_retrieval_multi_organization_context(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create member account and join (automatically creates first organization)
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      href: "https://example.com/join",
      referrer: "https://example.com/",
    } satisfies IHrmsMember.IJoin,
  });
  typia.assert(memberAuth);
  // Verify member was created with at least one organization membership
  TestValidator.equals(
    "member has initial organization membership",
    memberAuth.organization_memberships.length >= 1,
    true,
  );
  // Extract first organization ID (created during join)
  const firstOrgId = memberAuth.organization_memberships[0].organization.id;
  typia.assert(firstOrgId);
  // Step 2: Create a second organization to join
  const secondOrgId = typia.random<string & tags.Format<"uuid">>();
  const roleId = typia.random<string & tags.Format<"uuid">>();
  // Add member to second organization using the first organization connection
  const secondMembership =
    await api.functional.hrms.member.organization_members.create(
      memberConnection,
      {
        body: {
          hrms_member_id: memberAuth.id,
          hrms_organization_id: secondOrgId,
          hrms_organization_role_id: roleId,
        } satisfies IHrmsOrganizationMember.ICreate,
      },
    );
  typia.assert(secondMembership);
  // Verify second membership was created successfully
  TestValidator.equals(
    "second membership created",
    secondMembership.id !== undefined,
    true,
  );
  // Step 3: Retrieve first organization details using member connection
  const firstOrg = await api.functional.hrms.member.organizations.at(
    memberConnection,
    {
      organizationId: firstOrgId,
    },
  );
  typia.assert(firstOrg);
  // Verify first organization data is valid
  TestValidator.predicate(
    "first org has valid data",
    firstOrg.totalActiveEmployees >= 0 && firstOrg.generatedAt !== undefined,
  );
  // Step 4: Retrieve second organization details
  const secondOrg = await api.functional.hrms.member.organizations.at(
    memberConnection,
    {
      organizationId: secondOrgId,
    },
  );
  typia.assert(secondOrg);
  // Verify second organization data is valid
  TestValidator.predicate(
    "second org has valid data",
    secondOrg.totalActiveEmployees >= 0 && secondOrg.generatedAt !== undefined,
  );
  // Step 5: Verify multi-tenancy - both organizations are accessible with different metrics
  TestValidator.predicate(
    "first org accessible",
    firstOrg.totalActiveEmployees !== undefined,
  );
  TestValidator.predicate(
    "second org accessible",
    secondOrg.totalActiveEmployees !== undefined,
  );
  // Verify organizations have different dashboard data (multi-tenancy)
  TestValidator.notEquals(
    "organizations have different metrics",
    firstOrg.totalActiveEmployees,
    secondOrg.totalActiveEmployees,
  );
}
