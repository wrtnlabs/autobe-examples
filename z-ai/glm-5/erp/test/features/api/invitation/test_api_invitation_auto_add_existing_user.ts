import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmInvitation";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_organizations_create } from "../../../generate/generate_random_erp_hrm_member_organizations_create";
import { generate_random_erp_hrm_member_organizations_invitations_create } from "../../../generate/generate_random_erp_hrm_member_organizations_invitations_create";
import { prepare_random_erp_hrm_invitation } from "../../../prepare/prepare_random_erp_hrm_invitation";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";

export async function test_api_invitation_auto_add_existing_user(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create Member A and Organization A
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberA);
  const organizationA =
    await generate_random_erp_hrm_member_organizations_create(
      memberAConnection,
      {},
    );
  typia.assert(organizationA);
  // Step 2: Create Member B (existing user in the system)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberB);
  // Create Organization B for Member B (establishes them as existing member)
  await generate_random_erp_hrm_member_organizations_create(
    memberBConnection,
    {},
  );
  // Step 3: Member A invites Member B's email to Organization A
  // Member B already exists in the system, so this should trigger auto-add behavior
  const invitation =
    await api.functional.erpHrm.member.organizations.invitations.create(
      memberAConnection,
      {
        organizationId: organizationA.id,
        body: {
          email: memberB.email,
          roleId: typia.random<string & tags.Format<"uuid">>(),
        } satisfies IErpHrmInvitation.ICreate,
      },
    );
  typia.assert(invitation);
  // Step 4: Validate the invitation response reflects auto-add behavior
  TestValidator.equals(
    "invitation email matches",
    invitation.email,
    memberB.email,
  );
  TestValidator.equals(
    "invitation organization matches",
    invitation.organization.id,
    organizationA.id,
  );
  TestValidator.predicate(
    "invitation has valid role",
    invitation.role.id.length > 0,
  );
  TestValidator.predicate(
    "invitation has created_at timestamp",
    invitation.created_at.length > 0,
  );
  // When auto-adding existing user, status should be 'accepted' rather than 'pending'
  TestValidator.equals(
    "invitation status is accepted (auto-add)",
    invitation.status,
    "accepted",
  );
}
