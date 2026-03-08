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

export async function test_api_member_token_refresh_expired_token(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member joins to obtain initial refresh token
  const memberConnection: api.IConnection = { host: connection.host };
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(1),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.IJoin;
  const auth = await authorize_member_join(memberConnection, {
    body: joinInput,
  });
  typia.assert(auth);
  // 2. Attempt to refresh with an expired/invalid refresh token
  const refreshConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "expired refresh token should be rejected",
    401,
    async () => {
      await authorize_member_refresh(refreshConnection, {
        body: {
          refresh: "expired.invalid.token.here",
        } satisfies IDiscussionBoardMember.IRefresh,
      });
    },
  );
  // 3. Verify member can still login with original credentials
  const loginConnection: api.IConnection = { host: connection.host };
  const loginAuth = await authorize_member_login(loginConnection, {
    body: {
      email: joinInput.email,
      password: joinInput.password,
    },
  });
  typia.assert(loginAuth);
  // Validate login success
  TestValidator.equals("email matches", loginAuth.email, joinInput.email);
  TestValidator.predicate(
    "has valid access token",
    loginAuth.token.access.length > 0,
  );
  TestValidator.predicate(
    "has valid refresh token",
    loginAuth.token.refresh.length > 0,
  );
}
