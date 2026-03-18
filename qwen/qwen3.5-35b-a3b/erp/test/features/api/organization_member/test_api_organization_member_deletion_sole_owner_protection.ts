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

export async function test_api_organization_member_deletion_sole_owner_protection(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a member account (will be sole owner of new organization)
  const joined = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmsMember.IJoin,
  });
  typia.assert(joined);
  // 2. Verify member is sole owner (only one organization membership)
  TestValidator.equals(
    "sole owner membership count",
    joined.organization_memberships.length,
    1,
  );
  // 3. Extract and assert the first organization membership
  const firstMembership = joined.organization_memberships[0];
  typia.assert(firstMembership);
  typia.assert(firstMembership.organizationRole);
  typia.assert(firstMembership.organization);
  typia.assert(firstMembership.member);
  // 4. Verify the role is Owner
  TestValidator.equals(
    "membership role is Owner",
    firstMembership.organizationRole.name,
    "Owner",
  );
  // 5. Extract the organization member ID for deletion attempt
  const organizationMemberId: string & tags.Format<"uuid"> = firstMembership.id;
  // 6. Attempt to delete the sole owner's organization membership
  // This should fail with 409 Conflict due to sole owner protection
  await TestValidator.error(
    "sole owner cannot be deleted from organization",
    async () => {
      await api.functional.hrms.member.organization_members.erase(connection, {
        organizationMemberId,
      });
    },
  );
}
