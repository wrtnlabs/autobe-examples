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

export async function test_api_password_reset_valid_token(
  connection: api.IConnection,
): Promise<void> {
  // Create user account
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: RandomGenerator.name(2),
    } satisfies IRedditMember.IJoin,
  });
  // Get password reset token
  const resetId = typia.random<string & tags.Format<"uuid">>();
  const token = await api.functional.reddit.member.password_resets.at(
    userConnection,
    {
      resetId,
    },
  );
  typia.assert(token);
  // Validate token details
  TestValidator.predicate(
    "token has not expired",
    Date.parse(token.expires_at) > Date.now(),
  );
  TestValidator.equals("token is not used", !token.used_at, true);
  TestValidator.equals("token is not deleted", token.deleted_at, null);
  // Check required response fields
  TestValidator.predicate("id present", typeof token.id === "string");
  TestValidator.predicate(
    "token string present",
    typeof token.token === "string",
  );
  TestValidator.predicate(
    "expires_at present",
    typeof token.expires_at === "string",
  );
  TestValidator.predicate(
    "created_at present",
    typeof token.created_at === "string",
  );
  TestValidator.predicate(
    "updated_at present",
    typeof token.updated_at === "string",
  );
  TestValidator.predicate(
    "member profile summary present",
    typeof token.member === "object",
  );
}
