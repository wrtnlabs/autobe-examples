import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_join_duplicate_email_conflict(
  connection: api.IConnection,
): Promise<void> {
  // 1) Setup: create unique member credentials (email A)
  const memberConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const password1 = RandomGenerator.alphaNumeric(16);
  const password2 = RandomGenerator.alphaNumeric(16);
  const firstBody = {
    email,
    password: password1,
  } satisfies IShoppingMallMember.IJoin;
  const firstJoin = await authorize_member_join(memberConnection, {
    body: firstBody,
  });
  typia.assert(firstJoin);
  const { token: firstToken } = firstJoin;
  TestValidator.predicate(
    "first join access token should be non-empty",
    firstToken.access.length > 0,
  );
  TestValidator.predicate(
    "first join refresh token should be non-empty",
    firstToken.refresh.length > 0,
  );
  const firstExpiredAtMs = Date.parse(firstToken.expired_at);
  const firstRefreshableUntilMs = Date.parse(firstToken.refreshable_until);
  TestValidator.predicate(
    "first token expired_at should be parseable",
    Number.isFinite(firstExpiredAtMs),
  );
  TestValidator.predicate(
    "first token refreshable_until should be parseable",
    Number.isFinite(firstRefreshableUntilMs),
  );
  TestValidator.predicate(
    "first token expired_at should be earlier than refreshable_until",
    firstExpiredAtMs < firstRefreshableUntilMs,
  );
  // 3) Attempt duplicate join with same email but different password
  const duplicateConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "duplicate member join should conflict with 409",
    409,
    async () => {
      await authorize_member_join(duplicateConnection, {
        body: {
          email,
          password: password2,
        } satisfies IShoppingMallMember.IJoin,
      });
    },
  );
  // 5) Re-assert original token metadata remains well-formed
  TestValidator.predicate(
    "first join access token should still be non-empty",
    firstToken.access.length > 0,
  );
  TestValidator.predicate(
    "first join refresh token should still be non-empty",
    firstToken.refresh.length > 0,
  );
  const secondExpiredAtMs = Date.parse(firstToken.expired_at);
  const secondRefreshableUntilMs = Date.parse(firstToken.refreshable_until);
  TestValidator.predicate(
    "first token expired_at should still be parseable",
    Number.isFinite(secondExpiredAtMs),
  );
  TestValidator.predicate(
    "first token refreshable_until should still be parseable",
    Number.isFinite(secondRefreshableUntilMs),
  );
  TestValidator.predicate(
    "first token expired_at should still be earlier than refreshable_until",
    secondExpiredAtMs < secondRefreshableUntilMs,
  );
}
