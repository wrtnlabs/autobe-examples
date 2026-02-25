import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditMember";
import type { IRedditMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditMemberPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_password_reset_expired_token(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member setup
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: RandomGenerator.name(),
    } satisfies IRedditMember.IJoin,
  });
  // 2. Generate token ID (simulated expiry)
  const resetId = typia.random<string & tags.Format<"uuid">>();
  // 3. Fetch token and verify
  const token = await api.functional.reddit.member.password_resets.at(
    memberConnection,
    {
      resetId,
    },
  );
  // 4. Validate expiration (using UTC date)
  const expirationDate = new Date(token.expires_at);
  const now = new Date();
  TestValidator.predicate(
    `token expired (expires at < now)`,
    expirationDate < now,
  );
  // 5. Confirm soft-deletion state
  TestValidator.equals("deleted_at is null", token.deleted_at, null);
  // 6. Confirm token was not used
  TestValidator.equals("used_at is null (token not used)", token.used_at, null);
}
