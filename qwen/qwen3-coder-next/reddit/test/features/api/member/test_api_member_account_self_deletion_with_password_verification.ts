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

export async function test_api_member_account_self_deletion_with_password_verification(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member and get authenticated session
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphabets(8),
      password: "TestPassword123!",
      display_name: RandomGenerator.name(),
      bio: null,
      avatar_url: null,
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(member);
  // 2. Self-delete account using authenticated session with correct password
  await api.functional.redditLike.member.users.erase(memberConnection, {
    userId: member.id,
    body: {
      password: "TestPassword123!",
    } satisfies IRedditLikeMember.IDeleteRequest,
  });
  // 3. Verify account cannot be accessed after deletion (should return 404)
  await TestValidator.error("account not found after deletion", async () => {
    await api.functional.redditLike.member.users.erase(memberConnection, {
      userId: member.id,
      body: {
        password: "TestPassword123!",
      } satisfies IRedditLikeMember.IDeleteRequest,
    });
  });
}
