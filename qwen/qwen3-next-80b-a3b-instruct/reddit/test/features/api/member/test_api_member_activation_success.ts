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
export async function test_api_member_activation_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new member account with pending activation status
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const memberPassword: string = RandomGenerator.alphaNumeric(16);
  const memberConnection: api.IConnection = { host: connection.host };
  const registeredMember: ICommunityBbsMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: memberEmail,
        password: memberPassword,
      } satisfies ICommunityBbsMember.IJoin,
    });
  typia.assert(registeredMember);
  // Verify the member is in pending verification status after registration
  TestValidator.equals(
    "member status should be pending_verification",
    registeredMember.status,
    "pending_verification",
  );
  TestValidator.predicate(
    "account_verified should be false",
    () => registeredMember.account_verified === false,
  );
  // Step 2: Activate the member account using the userId from registration
  const activationConnection: api.IConnection = { host: connection.host };
  // Call the activation endpoint with only the userId path parameter (no request body)
  const activatedRecord: ICommunityBbsUserActivation =
    await api.functional.communityBbs.member.users.activation.putByUserid(
      activationConnection,
      {
        userId: registeredMember.id,
      },
    );
  typia.assert(activatedRecord);
  // Step 3: Validate the activation results
  // The activation record should have status 'active'
  TestValidator.equals(
    "activation status should be active",
    activatedRecord.status,
    "active",
  );
  // activated_at should be set with a current timestamp (not null)
  TestValidator.notEquals(
    "activated_at should not be null",
    activatedRecord.activated_at,
    null,
  );
  TestValidator.notEquals(
    "activated_at should not be undefined",
    activatedRecord.activated_at,
    undefined,
  );
  // Verify the user_id matches the original registered user
  TestValidator.equals(
    "activation user_id matches registered member id",
    activatedRecord.user_id,
    registeredMember.id,
  );
  // Activation code, metadata and ip_address should not be set per API contract
  TestValidator.equals(
    "activation_code should be undefined",
    activatedRecord.activation_code,
    undefined,
  );
  TestValidator.equals(
    "metadata should be undefined",
    activatedRecord.metadata,
    undefined,
  );
  TestValidator.equals(
    "ip_address should be undefined",
    activatedRecord.ip_address,
    undefined,
  );
  // Step 4: Verify the activation took effect by logging in
  const loginConnection: api.IConnection = { host: connection.host };
  const activatedMember: ICommunityBbsMember.IAuthorized =
    await authorize_member_login(loginConnection, {
      body: {
        email: memberEmail,
        password: memberPassword,
      } satisfies ICommunityBbsMember.ILogin,
    });
  typia.assert(activatedMember);
  // Confirm member status is now active after successful activation
  TestValidator.equals(
    "member status after activation should be active",
    activatedMember.status,
    "active",
  );
  TestValidator.equals(
    "account_verified should be true after activation",
    activatedMember.account_verified,
    true,
  );
}
