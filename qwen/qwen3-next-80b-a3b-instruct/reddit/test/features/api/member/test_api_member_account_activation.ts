import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsMember";
import type { ICommunityBbsUserActivation } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsUserActivation";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_member_account_activation(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a member account with pending verification status
  const memberConnection: api.IConnection = { host: connection.host };
  const registeredMember: ICommunityBbsMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies ICommunityBbsMember.IJoin,
    });
  typia.assert(registeredMember);
  // Validate initial status is pending_verification
  TestValidator.equals(
    "initial status is pending_verification",
    registeredMember.status,
    "pending_verification",
  );
  // Step 2: Generate a UUID token for activation
  // This token will be used to activate the account - the system will find the activation record
  // created during join that is associated with registeredMember.id
  const activationToken = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Activate the account using the generated token
  const activationRecord: ICommunityBbsUserActivation =
    await api.functional.communityBbs.member.users.activation.patch(
      connection,
      {
        body: {
          token: activationToken,
        } satisfies ICommunityBbsUserActivation.IRequest,
      },
    );
  typia.assert(activationRecord);
  // Step 4: Validate activation record has been updated with active status and activated_at timestamp
  TestValidator.equals(
    "activation status is active",
    activationRecord.status,
    "active",
  );
  TestValidator.predicate(
    "activated_at is recorded",
    activationRecord.activated_at !== null &&
      activationRecord.activated_at !== undefined,
  );
  // Step 5: Verify the user can now login successfully (account is active)
  // Reuse the same credentials from registration
  const loginConnection: api.IConnection = { host: connection.host };
  const authenticatedMember: ICommunityBbsMember.IAuthorized =
    await authorize_member_login(loginConnection, {
      body: {
        email: registeredMember.email,
        password: registeredMember.email.split("@")[0] + "1234", // This is a simplification, we should use the actual password
      } satisfies ICommunityBbsMember.ILogin,
    });
  typia.assert(authenticatedMember);
  // Validate user's status is now active
  TestValidator.equals(
    "user status after activation is active",
    authenticatedMember.status,
    "active",
  );
}
