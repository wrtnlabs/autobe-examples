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

export async function test_api_member_retrieve_another_member_with_admin_permission(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first member (admin/owner)
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_member_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmsMember.IJoin,
  });
  typia.assert(admin);
  // 2. Create organization for admin
  const adminOrgMembership =
    await generate_random_hrms_member_organization_members_create(
      adminConnection,
      {
        body: undefined,
      },
    );
  typia.assert(adminOrgMembership);
  // 3. Create second member (target to be retrieved)
  const targetConnection: api.IConnection = { host: connection.host };
  const target = await authorize_member_join(targetConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmsMember.IJoin,
  });
  typia.assert(target);
  // 4. Add target member to the same organization
  const targetOrgMembership =
    await generate_random_hrms_member_organization_members_create(
      adminConnection,
      {
        body: {
          hrms_member_id: target.id,
          hrms_organization_id: adminOrgMembership.organization.id,
          hrms_organization_role_id: adminOrgMembership.organizationRole.id,
        } satisfies IHrmsOrganizationMember.ICreate,
      },
    );
  typia.assert(targetOrgMembership);
  // 5. Retrieve target member's profile using admin connection
  const retrievedMember = await api.functional.hrms.members.at(
    adminConnection,
    {
      memberId: target.id,
    },
  );
  typia.assert(retrievedMember);
  // 6. Validate response structure
  TestValidator.equals("email matches", retrievedMember.email, target.email);
  TestValidator.equals(
    "display_name matches",
    retrievedMember.display_name,
    target.display_name,
  );
  TestValidator.equals(
    "avatar_uri matches",
    retrievedMember.avatar_uri,
    target.avatar_uri,
  );
  TestValidator.equals(
    "phone_number matches",
    retrievedMember.phone_number,
    target.phone_number,
  );
  // 7. Validate organization_memberships array
  TestValidator.equals(
    "organization memberships count",
    retrievedMember.organization_memberships.length,
    1,
  );
  // 8. Security: Validate password_hash is NOT included in response
  const hasPasswordHash = "password_hash" in retrievedMember;
  TestValidator.predicate(
    "password_hash should not be included in response for security",
    hasPasswordHash === false,
  );
}
