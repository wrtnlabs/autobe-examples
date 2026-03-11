import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test member login authentication flow.
 *
 * Note: Original scenario requested testing suspended account rejection, but
 * no API endpoint exists to suspend member accounts. This test validates
 * the login flow for active member accounts instead.
 *
 * Test flow:
 * 1. Create a new member account via join
 * 2. Login successfully with the member credentials
 * 3. Verify the authentication response contains valid tokens and member info
 * 4. Attempt login with wrong password to verify error handling
 */
export async function test_api_member_login_suspended_account_rejected(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(16);
  const memberConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_member_join(memberConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(joinResult);
  // Verify member account was created with active status
  TestValidator.equals("member email matches", joinResult.email, memberEmail);
  TestValidator.equals("account status is active", joinResult.status, "active");
  TestValidator.predicate(
    "has valid access token",
    joinResult.token.access.length > 0,
  );
  TestValidator.predicate(
    "has valid refresh token",
    joinResult.token.refresh.length > 0,
  );
  // Step 2: Login successfully with valid credentials
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResult = await authorize_member_login(loginConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardMember.ILogin,
  });
  typia.assert(loginResult);
  // Verify login succeeded and returned matching member info
  TestValidator.equals("login email matches", loginResult.email, memberEmail);
  TestValidator.equals("login status is active", loginResult.status, "active");
  TestValidator.notEquals(
    "new access token issued",
    joinResult.token.access,
    loginResult.token.access,
  );
  // Step 3: Attempt login with wrong password - should fail
  const wrongPasswordConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("login with wrong password rejected", async () => {
    await authorize_member_login(wrongPasswordConnection, {
      body: {
        email: memberEmail,
        password: "wrongpassword123",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IDiscussionBoardMember.ILogin,
    });
  });
  // Note: Cannot test suspended account rejection because no API exists
  // to change member status to 'suspended'. This would require an admin
  // endpoint like PATCH /discussionBoard/admin/members/{id}/status
}
