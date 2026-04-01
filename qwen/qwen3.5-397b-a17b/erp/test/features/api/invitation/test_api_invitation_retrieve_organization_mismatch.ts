import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformInvitation";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_invitations_create } from "../../../generate/generate_random_hrm_platform_member_invitations_create";
import { generate_random_hrm_platform_member_organizations_create } from "../../../generate/generate_random_hrm_platform_member_organizations_create";
import { prepare_random_hrm_platform_invitation } from "../../../prepare/prepare_random_hrm_platform_invitation";
import { prepare_random_hrm_platform_organization } from "../../../prepare/prepare_random_hrm_platform_organization";

/**
 * Test organization scoping enforcement when retrieving invitations.
 *
 * A member belongs to two organizations and creates an invitation in organization A,
 * then switches context to organization B and attempts to retrieve the invitation
 * from organization A. According to business rule in Section 251, invitations are
 * scoped to specific organizations and cannot be accessed from different organization
 * contexts. Validate that the system returns appropriate error response (404) when
 * attempting to access invitation from wrong organization context, ensuring proper
 * data isolation between organizations. This tests the multi-tenant security boundary
 * for invitation data.
 */
export async function test_api_invitation_retrieve_organization_mismatch(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member who will test organization scoping
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {});
  typia.assert(memberAuth);
  // 2. Create organization A
  const orgA =
    await generate_random_hrm_platform_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(orgA);
  // 3. Create invitation in organization A
  const invitation =
    await generate_random_hrm_platform_member_invitations_create(
      memberConnection,
      {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          role_id: typia.random<string & tags.Format<"uuid">>(),
          expires_at: new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        } satisfies IHrmPlatformInvitation.ICreate,
      },
    );
  typia.assert(invitation);
  // 4. Create organization B
  const orgB =
    await generate_random_hrm_platform_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(orgB);
  // 5. Switch member context to organization B
  const selectedOrg =
    await api.functional.hrmPlatform.member.organizations.select(
      memberConnection,
      {
        organizationId: orgB.id,
      },
    );
  typia.assert(selectedOrg);
  TestValidator.equals(
    "selected organization is org B",
    selectedOrg.id,
    orgB.id,
  );
  // 6. Attempt to retrieve invitation from organization A while in organization B context
  // This should fail with 404 due to organization scoping
  await TestValidator.error(
    "invitation not accessible from different organization",
    async () => {
      await api.functional.hrmPlatform.member.invitations.at(memberConnection, {
        invitationId: invitation.id,
      });
    },
  );
}