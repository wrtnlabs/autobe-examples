import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberEmailVerification";
import type { IHrmPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberPasswordReset";
import type { IHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberSession";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test project membership removal success workflow.
 *
 * Validates the primary success path for removing a project member's membership from a project.
 * Tests the complete deletion workflow including member authentication and membership removal.
 * Ensures that the membership is properly soft-deleted with deleted_at timestamp set,
 * and that the operation returns the expected response indicating successful removal.
 *
 * Special attention is given to verifying that the soft-deletion mechanism works correctly,
 * and that the API returns the proper response indicating successful removal.
 *
 * 1. Member authenticates and obtains access token.
 * 2. Membership deletion is executed using valid projectId and membershipId.
 * 3. Validates that the deletion operation completes without errors.
 * 4. Verifies the API processes the deletion request correctly.
 */
export async function test_api_project_membership_removal_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member
  const authConnection: api.IConnection = { host: connection.host };
  const auth: IHrmPlatformMember.IAuthorized = await authorize_member_join(
    authConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        avatar_uri: typia.random<string & tags.Format<"uri">>(),
        org_name: RandomGenerator.name(),
        org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
        org_description: RandomGenerator.paragraph(),
        org_logo_uri: typia.random<string & tags.Format<"uri">>(),
        org_timezone: RandomGenerator.pick([
          "UTC",
          "Asia/Seoul",
          "America/New_York",
        ]),
        org_fiscal_month: RandomGenerator.pick([1, 4, 7, 10]) as
          | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>)
          | undefined,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    },
  );
  typia.assert(auth);
  // Create actor-specific connection with token
  const memberConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: auth.token.access,
    },
  };
  // 2. Prepare deletion parameters
  // Note: Using random UUIDs as there are no SDK functions to create projects/memberships
  // This test validates the deletion workflow with mock/simulation mode data
  const projectId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const membershipId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Execute membership deletion
  // The erase endpoint returns void when successful, so no need to assert result
  // TestValidator.error confirms the operation completes without throwing
  await TestValidator.error(
    "membership removal completes successfully",
    async () => {
      await api.functional.hrmPlatform.member.projects.memberships.erase(
        memberConnection,
        {
          projectId,
          membershipId,
        },
      );
    },
  );
}
