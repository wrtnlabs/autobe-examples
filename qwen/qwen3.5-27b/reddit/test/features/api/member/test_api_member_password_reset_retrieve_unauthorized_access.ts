import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditCloneMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberPasswordReset";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test that a member cannot retrieve another member's password reset record.
 *
 * Validates the ownership verification mechanism that prevents members from accessing password reset tokens belonging to other users. This test ensures that even if a member obtains another user's password reset ID, they cannot retrieve the reset record due to ownership checks.
 *
 * The test registers two separate member accounts, authenticates as one member, and attempts to retrieve a password reset record that would belong to the other member. The system should reject this access attempt with a 403 Forbidden error.
 *
 * 1. Register first member account (member A) for authentication.
 * 2. Register second member account (member B) to simulate ownership of password reset.
 * 3. Authenticate as member A using their credentials.
 * 4. Attempt to retrieve a password reset record using a fabricated resetId that would belong to member B.
 * 5. Verify that the system returns 403 Forbidden error due to ownership mismatch.
 */
export async function test_api_member_password_reset_retrieve_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member A
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: "memberA@test.com",
      password: "password123",
      username: "memberA_user",
      href: "https://test.com/register",
      referrer: "https://test.com/home",
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(memberA);
  // 2. Register member B
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      email: "memberB@test.com",
      password: "password456",
      username: "memberB_user",
      href: "https://test.com/register",
      referrer: "https://test.com/home",
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(memberB);
  // 3. Authenticate as member A
  const memberAAuthConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(memberAAuthConnection, {
    body: {
      email: "memberA@test.com",
      password: "password123",
      href: "https://test.com/login",
      referrer: "https://test.com/home",
    },
  });
  // 4. Attempt to retrieve member B's password reset record as member A
  // Using a fabricated UUID to simulate accessing another member's reset record
  const fabricatedResetId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "member A cannot access member B's password reset",
    403,
    async () =>
      await api.functional.redditClone.member.member.password_resets.at(
        memberAAuthConnection,
        {
          resetId: fabricatedResetId,
        },
      ),
  );
}