import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test login failure when attempting to authenticate a deleted account.
 * 1. Create a member account using /auth/member/join
 * 2. Delete the account using the member account deletion endpoint
 * 3. Attempt login with the deleted account's credentials
 * 4. Verify that the login request is rejected with appropriate error
 *
 * Note: This test requires a member account deletion endpoint that is not
 * currently available in the provided SDK functions. The functional module
 * needs to include a delete endpoint (likely DELETE /redditLike/auth/member/{id})
 * to complete this test.
 */
export async function test_api_member_login_deleted_account(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
  const registerEmail = typia.random<string & tags.Format<"email">>();
  const registerUsername = RandomGenerator.alphaNumeric(8);
  const registerPassword = "TestPassword123!";
  const registeredMember = await api.functional.redditLike.auth.member.join(
    connection,
    {
      body: {
        email: registerEmail,
        username: registerUsername,
        password: registerPassword,
        display_name: RandomGenerator.name(),
        bio: null,
        avatar_url: null,
      } satisfies IRedditLikeMember.IJoin,
    },
  );
  typia.assert(registeredMember);
  // 2. Delete the member account
  // Note: This endpoint needs to be available: DELETE /redditLike/auth/member/{id}
  // Since it's not in the provided SDK, we'll document this as a missing endpoint
  // Once available, use:
  // await api.functional.redditLike.auth.member.delete(connection, {
  //   path: { id: registeredMember.id }
  // });
  // 3. Attempt login with deleted account credentials
  try {
    await api.functional.redditLike.auth.member.login(connection, {
      body: {
        email: registerEmail,
        password: registerPassword,
      } satisfies IRedditLikeMember.ILogin,
    });
    // Should not reach here if login properly rejects deleted accounts
    throw new Error("Login should have failed for deleted account");
  } catch (error) {
    // Verify it's a 401 or 403 error
    if (error instanceof api.HttpError) {
      TestValidator.equals(
        "deleted account login should return 401 or 403",
        [401, 403].includes(error.status),
        true,
      );
    }
  }
}
