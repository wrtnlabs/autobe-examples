import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_login_success_approved(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller account via join operation
  const joinConnection: api.IConnection = { host: connection.host };
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: (typia.random<string & tags.Format<"ipv4">>() ?? undefined),
  } satisfies IEcommerceMallSeller.IJoin;
  const seller = await authorize_seller_join(joinConnection, {
    body: joinInput,
  });
  typia.assert(seller);
  // 2. Login with same credentials
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResult = await authorize_seller_login(loginConnection, {
    body: {
      email: joinInput.email,
      password: joinInput.password,
    } satisfies IEcommerceMallSeller.ILogin,
  });
  typia.assert(loginResult);
  // 3. Validate token structure
  typia.assert(loginResult.token);
  TestValidator.predicate(
    "token has access",
    loginResult.token.access.length > 0,
  );
  TestValidator.predicate(
    "token has refresh",
    loginResult.token.refresh.length > 0,
  );
  // 4. Validate expiration timestamps are valid dates
  typia.assert(loginResult.token.expired_at);
  typia.assert(loginResult.token.refreshable_until);
  TestValidator.predicate(
    "expired_at is valid date",
    !isNaN(Date.parse(loginResult.token.expired_at)),
  );
  TestValidator.predicate(
    "refreshable_until is valid date",
    !isNaN(Date.parse(loginResult.token.refreshable_until)),
  );
  // 5. Validate seller account info
  typia.assert(seller.id);
  typia.assert(seller.email);
  typia.assert(seller.created_at);
  typia.assert(seller.updated_at);
  TestValidator.equals("email matches", seller.email, joinInput.email);
  TestValidator.predicate("created_at valid", seller.created_at !== undefined);
  TestValidator.predicate("updated_at valid", seller.updated_at !== undefined);
  TestValidator.equals("deleted_at null", seller.deleted_at, null);
  // 6. Validate login result matches seller account
  TestValidator.equals("login id matches seller id", loginResult.id, seller.id);
  TestValidator.equals(
    "login email matches seller email",
    loginResult.email,
    seller.email,
  );
  TestValidator.equals(
    "login created_at matches seller created_at",
    loginResult.created_at,
    seller.created_at,
  );
  TestValidator.equals(
    "login updated_at matches seller updated_at",
    loginResult.updated_at,
    seller.updated_at,
  );
}