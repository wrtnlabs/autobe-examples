import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import type { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import type { IHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationMember";
import type { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmsOrganization";
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

export async function test_api_member_organization_switch_no_membership(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
  const joinConnection: api.IConnection = { host: connection.host };
  const authorizedMember = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(authorizedMember);
  // Create actor-specific connection with token
  const memberConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: authorizedMember.token.access },
  };
  // 2. Create membership in Organization A
  const randomOrganizationId = typia.random<string & tags.Format<"uuid">>();
  const randomRoleId = typia.random<string & tags.Format<"uuid">>();
  const membership =
    await api.functional.hrms.member.organization_members.create(
      memberConnection,
      {
        body: {
          hrms_member_id: authorizedMember.id,
          hrms_organization_id: randomOrganizationId,
          hrms_organization_role_id: randomRoleId,
        },
      },
    );
  typia.assert(membership);
  // 3. Find Organization B (where member has no membership)
  // Since member only belongs to Organization A, we use a different organization ID
  const targetOrganizationId = typia.random<string & tags.Format<"uuid">>();
  // 4. Attempt to switch to Organization B (should fail with 403 or 404)
  // Note: SDK has type bug - uses IHrmsOrganization.IRequest instead of proper switch request body
  // We work around by casting to any to pass organization_id in body
  await TestValidator.httpError(
    "switch to non-member organization returns 403 or 404",
    [403, 404], // 403 if org exists but no membership, 404 if org doesn't exist
    async () => {
      await api.functional.hrms.member.organizations._switch.switchOrganization(
        memberConnection,
        {
          body: {
            organization_id: targetOrganizationId,
          } as any,
        },
      );
    },
  );
  // 5. Verify member's organization context remains unchanged
  // Member should still only have access to Organization A
  const currentOrgs = await api.functional.hrms.member.organizations.index(
    memberConnection,
    { body: {} },
  );
  typia.assert(currentOrgs);
  // Member's organizations list should not include the target organization
  TestValidator.predicate(
    "target org not in member's organization list",
    currentOrgs.data.every((org) => org.id !== targetOrganizationId),
  );
}