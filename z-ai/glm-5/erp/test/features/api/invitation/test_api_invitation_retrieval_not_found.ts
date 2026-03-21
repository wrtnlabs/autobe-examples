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
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";

/**
 * Test that attempting to retrieve a non-existent invitation returns 404 Not Found.
 *
 * Steps:
 * 1. Register a member and create an organization
 * 2. Attempt to retrieve an invitation using a random UUID that does not exist
 * 3. Validate that the response returns 404 Not Found status
 */
export async function test_api_invitation_retrieval_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create organization for context
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Generate a random UUID that doesn't exist in the system
  const nonExistentInvitationId = typia.random<string & tags.Format<"uuid">>();
  // 4. Attempt to retrieve non-existent invitation - should return 404
  await TestValidator.httpError(
    "should return 404 for non-existent invitation",
    404,
    async () => {
      await api.functional.erpHrm.member.organizations.invitations.at(
        memberConnection,
        {
          organizationId: organization.id,
          invitationId: nonExistentInvitationId,
        },
      );
    },
  );
}
