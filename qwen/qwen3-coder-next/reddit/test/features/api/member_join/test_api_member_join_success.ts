import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_join_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Generate unique credentials
  const email: string = typia.random<string & tags.Format<"email">>();
  const password: string = RandomGenerator.alphaNumeric(16);
  const username: string = RandomGenerator.name();
  // 2. Register new member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email,
      password,
      username,
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(member);
  // 3. Validate member profile
  TestValidator.equals("email matches", member.email, email);
  TestValidator.equals("username matches", member.username, username);
  TestValidator.equals("karma score initialized", member.karma_score, 0);
  TestValidator.predicate("has valid UUID", /^[0-9a-f-]{36}$/i.test(member.id));
  TestValidator.equals("email_verified is false", member.email_verified, false);
  TestValidator.predicate("has access token", member.token.access.length > 0);
  TestValidator.predicate("has refresh token", member.token.refresh.length > 0);
  TestValidator.predicate(
    "has valid expired_at",
    new Date(member.token.expired_at) > new Date(),
  );
  TestValidator.predicate(
    "has valid refreshable_until",
    new Date(member.token.refreshable_until) > new Date(),
  );
  // 4. Verify connection token is updated
  TestValidator.notEquals(
    "connection token updated",
    connection.headers?.Authorization,
    memberConnection.headers?.Authorization,
  );
}
