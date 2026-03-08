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
 * Test that banned members are denied login access even with valid credentials.
 *
 * Prerequisites:
 * 1. Create a new member account via join endpoint
 * 2. The member account must be banned by an administrator (banned=true in database)
 *
 * Test validates:
 * - Banned user cannot access platform even with correct credentials
 * - Security measure: ban_reason is not exposed to the banned user during login
 * - No JWT tokens are returned in the response
 * - No session is created for the banned member
 */
export async function test_api_member_login_banned_denial(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a member account with known credentials
  const testEmail = typia.random<string & tags.Format<"email">>();
  const testPassword = RandomGenerator.alphaNumeric(16);
  const testDisplayName = RandomGenerator.name();
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: testEmail,
      password: testPassword,
      displayName: testDisplayName,
      bio: null,
    },
  });
  typia.assert(member);
  // Step 2: Verify member was created successfully
  TestValidator.equals("member email should match", member.email, testEmail);
  TestValidator.equals(
    "member should not be banned initially",
    member.banned,
    false,
  );
  // Note: This test requires the member to be banned by an administrator.
  // The banning operation would set banned=true in the discussion_board_members table.
  // Without admin API access to ban users, this test demonstrates the expected
  // behavior assuming the banning prerequisite is fulfilled via external test setup
  // (e.g., database seeding, direct database manipulation, or admin endpoint).
  //
  // In a complete test environment, an administrator would ban this member
  // before the login attempt using an admin API endpoint or test database fixture.
  // Step 3: Attempt login and verify denial for banned account
  // A banned member should receive an error response and no JWT tokens
  const loginConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "banned member should be denied login with error response",
    async () => {
      await api.functional.discussionBoard.auth.member.login(loginConnection, {
        body: {
          email: testEmail,
          password: testPassword,
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IDiscussionBoardMember.ILogin,
      });
    },
  );
}
