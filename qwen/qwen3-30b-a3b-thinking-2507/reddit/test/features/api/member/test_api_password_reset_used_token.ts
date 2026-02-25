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

export async function test_api_password_reset_used_token(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member via join (for password reset token)
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "test1234",
      username: RandomGenerator.name(),
    } satisfies IRedditMember.IJoin,
  });
  // 2. Generate random token ID (simulate existing used token)
  const resetId = typia.random<string & tags.Format<"uuid">>();
  // 3. Request token status (token should be marked used for invalid)
  const token = await api.functional.reddit.member.password_resets.at(
    connection,
    {
      resetId,
    },
  );
  typia.assert(token);
  // 4. Verify token is marked as used (invalid)
  TestValidator.predicate(
    "used_at should be set (token marked as used)",
    token.used_at !== null && token.used_at !== undefined,
  );
}
