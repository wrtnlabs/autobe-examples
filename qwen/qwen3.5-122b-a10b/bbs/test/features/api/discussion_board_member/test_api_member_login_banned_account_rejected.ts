import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test member login workflow for discussion board.
 *
 * This test validates the member registration and authentication flow:
 * 1. Register a new member account with email/password credentials
 * 2. Verify account is created with active ban_status
 * 3. Login with valid credentials and verify authentication succeeds
 *
 * NOTE: Testing banned account rejection requires admin ban API endpoint.
 * Since no ban endpoint is available in the provided SDK functions, this test
 * validates the successful login flow. To test banned account rejection:
 * - Admin API would need to ban the member (update ban_status to 'banned')
 * - Login attempt should then return 403 Forbidden with ban_reason in error
 * - This requires additional admin endpoints not currently available in SDK
 */
export async function test_api_member_login_banned_account_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const displayName = RandomGenerator.name();
  const member = await authorize_member_join(memberConnection, {
    body: {
      email,
      password,
      displayName,
      bio: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(member);
  // 2. Verify account created with active status
  TestValidator.predicate(
    "account has active ban_status",
    member.ban_status === "active",
  );
  // 3. Login with valid credentials (should succeed for active account)
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResult = await authorize_member_login(loginConnection, {
    body: {
      email,
      password,
    } satisfies IDiscussionBoardMember.ILogin,
  });
  typia.assert(loginResult);
  // 4. Verify login succeeded with correct member data
  TestValidator.predicate(
    "login returns active ban_status",
    loginResult.ban_status === "active",
  );
  TestValidator.equals(
    "login token matches member id",
    loginResult.id,
    member.id,
  );
}
