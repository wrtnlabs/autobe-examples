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

export async function test_api_member_join_success_token_issued(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const body = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IShoppingMallMember.IJoin;
  const authorized = await authorize_member_join(memberConnection, {
    body,
  });
  typia.assert(authorized);
  TestValidator.predicate(
    "token.access should be non-empty",
    authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "token.refresh should be non-empty",
    authorized.token.refresh.length > 0,
  );
  const expiredAt = new Date(authorized.token.expired_at);
  const refreshableUntil = new Date(authorized.token.refreshable_until);
  TestValidator.predicate(
    "token.expired_at should be parseable ISO date-time",
    !Number.isNaN(expiredAt.getTime()),
  );
  TestValidator.predicate(
    "token.refreshable_until should be parseable ISO date-time",
    !Number.isNaN(refreshableUntil.getTime()),
  );
  TestValidator.predicate(
    "token.expired_at should be earlier than token.refreshable_until",
    expiredAt.getTime() < refreshableUntil.getTime(),
  );
  // Runtime security check: ensure no plaintext password fields appear.
  TestValidator.predicate(
    "response must not expose plaintext password fields",
    !("password" in authorized) &&
      !("plain_password" in authorized) &&
      !("password_hash" in authorized),
  );
}
