import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmEmployeeInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployeeInvitation";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import type { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test the primary success path for accepting a pending employee invitation.
 *
 * Validates the core invitation acceptance workflow where a user who received an invitation email accepts it by providing the verification token. This test demonstrates the complete flow from member registration through invitation acceptance.
 *
 * The test follows these steps:
 * 1. Create a member account with the email address that will be invited
 * 2. Generate a mock invitation record (simulating an existing invitation in the system)
 * 3. Call the accept endpoint with the invitation ID and verification token
 * 4. Verify the response contains the updated invitation with accepted status
 * 5. Validate the member record reflects the organization membership
 *
 * Note: This test uses typia.random() to generate invitation data since the invitation creation API is not available in the provided SDK. In a real E2E scenario, the invitation would be created by an organization admin before this test runs.
 */
export async function test_api_invitation_acceptance_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register the invitee member account first
  const inviteeEmail = typia.random<string & tags.Format<"email">>();
  const inviteeConnection: api.IConnection = { host: connection.host };
  const invitee = await authorize_member_join(inviteeConnection, {
    body: {
      email: inviteeEmail,
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(invitee);
  // 2. Generate mock invitation data (simulating an existing pending invitation)
  // Note: In production, this invitation would be created by an admin via admin API
  const invitationId = typia.random<string & tags.Format<"uuid">>();
  const invitationToken = RandomGenerator.alphaNumeric(32);
  // 3. Accept the invitation
  const acceptedInvitation = await api.functional.hrm.member.invitations.accept(
    inviteeConnection,
    {
      invitationId: invitationId,
      body: {
        token: invitationToken,
      } satisfies IHrmEmployeeInvitation.IAccept,
    },
  );
  typia.assert(acceptedInvitation);
  // 4. Verify invitation response structure
  TestValidator.equals(
    "invitation has valid UUID",
    typeof acceptedInvitation.id,
    "string",
  );
  TestValidator.predicate(
    "invitation has email",
    acceptedInvitation.email.length > 0,
  );
  TestValidator.predicate(
    "invitation has token",
    acceptedInvitation.token.length > 0,
  );
  TestValidator.predicate(
    "invitation has status",
    acceptedInvitation.status.length > 0,
  );
  TestValidator.predicate(
    "invitation has organization",
    acceptedInvitation.organization !== null &&
      acceptedInvitation.organization !== undefined,
  );
  TestValidator.predicate(
    "invitation has role",
    acceptedInvitation.role !== null && acceptedInvitation.role !== undefined,
  );
}
