import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test login failure when email does not exist in the system.
 *
 * This test validates that attempting to login with a non-existent email
 * address properly fails without revealing whether the email exists or
 * the password is incorrect (security best practice).
 *
 * Test flow:
 * 1. Create a member account using authorize_member_join (for test isolation)
 * 2. Attempt login with a completely different email that was never registered
 * 3. Verify the login request is rejected with an error response
 */
export async function test_api_member_login_nonexistent_email(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a member account for test context (test isolation)
  const memberJoinConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  // 2. Attempt login with a non-existent email address
  // This should fail as the email was never registered
  const nonExistentEmail = typia.random<string & tags.Format<"email">>();
  const loginConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "login with non-existent email should fail",
    async () => {
      await authorize_member_login(loginConnection, {
        body: {
          email: nonExistentEmail,
          password: RandomGenerator.alphaNumeric(16),
        } satisfies IRedditCommunityMember.ILogin,
      });
    },
  );
}
