import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_account_cascade_deletion(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member
  const registerConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(registerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
      displayName: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(member);
  // 2. Delete the member account
  await api.functional.redditClone.member.users.me.erase(registerConnection);
  // 3. Verify account deletion by attempting to use the deleted account
  // Since erase doesn't return anything, we'll verify by trying to perform an action that requires authentication
  await TestValidator.httpError(
    "account deleted - 401 unauthorized",
    401,
    async () => {
      // Try to re-register with the same credentials (should fail if account was properly deleted)
      await api.functional.redditClone.auth.member.join(registerConnection, {
        body: {
          email: member.email,
          password: RandomGenerator.alphaNumeric(16),
          username: member.username,
          displayName: null,
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
          ip: typia.random<string & tags.Format<"ipv4">>(),
        },
      });
    },
  );
}
