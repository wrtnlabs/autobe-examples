import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_member_status_expired_session(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new member account using the authorization function
  const memberConnection: api.IConnection = { host: connection.host };
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(16);
  const href = `https://example.com/join?source=${RandomGenerator.alphaNumeric(12)}`;
  const referrer = `https://example.com/referrer?source=${RandomGenerator.alphaNumeric(12)}`;
  await authorize_member_join(memberConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href,
      referrer,
    } satisfies IDiscussionBoardUser.IJoin,
  });
  // Step 2: Log in to establish an active session
  await authorize_member_login(memberConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href,
      referrer,
    } satisfies IDiscussionBoardUser.ILogin,
  });
  // Step 3: Get the initial session status to confirm it's active
  const initialStatus: IDiscussionBoardUser.IStatus =
    await api.functional.auth.member.status(memberConnection);
  typia.assert(initialStatus);
  TestValidator.equals(
    "Initial member status should be active",
    initialStatus.is_active,
    true,
  );
  TestValidator.predicate("Initial expires_at should be in the future", () => {
    const expiresAt = new Date(initialStatus.expires_at);
    return expiresAt > new Date();
  });
  // Step 4: Wait for 2 seconds to allow session to expire (in test environment)
  // This is a test-only hack since we can't directly manipulate session time
  await new Promise((resolve) => setTimeout(resolve, 2000));
  // Step 5: Call status endpoint again to check for expiration
  const expiredStatus: IDiscussionBoardUser.IStatus =
    await api.functional.auth.member.status(memberConnection);
  typia.assert(expiredStatus);
  // Step 6: Validate that the session is now expired
  TestValidator.equals(
    "Member status should be inactive after expiration",
    expiredStatus.is_active,
    false,
  );
  TestValidator.predicate("Expires at should be in the past", () => {
    const expiresAt = new Date(expiredStatus.expires_at);
    return expiresAt < new Date();
  });
}
