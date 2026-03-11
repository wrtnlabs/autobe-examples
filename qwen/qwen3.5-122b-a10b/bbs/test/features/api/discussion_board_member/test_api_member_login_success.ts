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

export async function test_api_member_login_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a registered member account
  const password = RandomGenerator.alphaNumeric(16);
  const joinConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: password,
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(member);
  // 2. Login with the same credentials
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResult = await authorize_member_login(loginConnection, {
    body: {
      email: member.email,
      password: password,
    } satisfies IDiscussionBoardMember.ILogin,
  });
  typia.assert(loginResult);
  // 3. Validate response structure
  TestValidator.equals("member ID matches", loginResult.id, member.id);
  TestValidator.equals("email matches", loginResult.email, member.email);
  TestValidator.equals(
    "display name matches",
    loginResult.display_name,
    member.display_name,
  );
  TestValidator.predicate(
    "ban status is active",
    loginResult.ban_status === "active",
  );
  TestValidator.predicate(
    "has access token",
    loginResult.access_token.length > 0,
  );
  TestValidator.predicate(
    "has refresh token",
    loginResult.refresh_token.length > 0,
  );
  TestValidator.equals(
    "token type is Bearer",
    loginResult.token_type,
    "Bearer",
  );
  TestValidator.predicate(
    "expires_in is 3600",
    loginResult.expires_in === 3600,
  );
  TestValidator.predicate("has valid token object", loginResult.token !== null);
  TestValidator.predicate(
    "token has access",
    loginResult.token.access.length > 0,
  );
  TestValidator.predicate(
    "token has refresh",
    loginResult.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "token has expired_at",
    loginResult.token.expired_at !== null,
  );
  TestValidator.predicate(
    "token has refreshable_until",
    loginResult.token.refreshable_until !== null,
  );
}
