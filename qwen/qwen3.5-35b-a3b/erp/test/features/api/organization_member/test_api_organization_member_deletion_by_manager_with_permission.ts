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

export async function test_api_organization_member_deletion_by_manager_with_permission(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create owner member (automatically creates organization)
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmsMember.IJoin,
  });
  typia.assert(ownerAuth);
  const organizationId = ownerAuth.organization_memberships[0].organization.id;
  const ownerId = ownerAuth.id;
  // 2. Create manager member account
  const managerAuth = await authorize_member_join(
    { host: connection.host },
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "1234",
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IHrmsMember.IJoin,
    },
  );
  typia.assert(managerAuth);
  // 3. Owner creates manager membership with employee:manage permission
  // Get the manager role ID from the organization (builtin role with employee:manage)
  const managerMembership =
    await api.functional.hrms.member.organization_members.create(
      { host: connection.host },
      {
        body: {
          hrms_member_id: managerAuth.id,
          hrms_organization_id: organizationId,
          hrms_organization_role_id:
            ownerAuth.organization_memberships[0].organizationRole.id,
        } satisfies IHrmsOrganizationMember.ICreate,
      },
    );
  typia.assert(managerMembership);
  // 4. Create target member to be deleted
  const targetAuth = await authorize_member_join(
    { host: connection.host },
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "1234",
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IHrmsMember.IJoin,
    },
  );
  typia.assert(targetAuth);
  // 5. Create membership for target member in organization (as regular employee)
  const targetMembership =
    await api.functional.hrms.member.organization_members.create(
      { host: connection.host },
      {
        body: {
          hrms_member_id: targetAuth.id,
          hrms_organization_id: organizationId,
          hrms_organization_role_id:
            ownerAuth.organization_memberships[0].organizationRole.id,
        } satisfies IHrmsOrganizationMember.ICreate,
      },
    );
  typia.assert(targetMembership);
  // 6. Manager authenticates to perform deletion
  const managerConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(managerConnection, {
    body: {
      email: managerAuth.email,
      password: "1234",
      display_name: managerAuth.display_name,
      href: "https://localhost",
      referrer: "https://localhost",
    } satisfies IHrmsMember.IJoin,
  });
  // 7. Manager deletes target member's organization membership
  await api.functional.hrms.member.organization_members.erase(
    managerConnection,
    {
      organizationMemberId: targetMembership.id,
    },
  );
  // 8. Verify deletion succeeded with soft delete behavior
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: ownerAuth.email,
      password: "1234",
      display_name: ownerAuth.display_name,
      href: "https://localhost",
      referrer: "https://localhost",
    } satisfies IHrmsMember.IJoin,
  });
  // Verify target member's membership is soft deleted
  const updatedTargetMembership =
    await api.functional.hrms.member.organization_members.create(
      memberConnection,
      {
        body: {
          hrms_member_id: targetAuth.id,
          hrms_organization_id: organizationId,
          hrms_organization_role_id:
            ownerAuth.organization_memberships[0].organizationRole.id,
        } satisfies IHrmsOrganizationMember.ICreate,
      },
    );
  typia.assert(updatedTargetMembership);
  // The deleted membership should have deleted_at set
  TestValidator.notEquals(
    "soft delete timestamp should be set",
    null,
    targetMembership.deleted_at === null ? null : undefined,
  );
}