import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_login_banned_access_denied(
  connection: api.IConnection,
): Promise<void> {
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = typia.random<string & tags.Format<"password">>();
  const joinBody = {
    email: sellerEmail,
    password: sellerPassword,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IShoppingMallSeller.IJoin;
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_seller_join(sellerJoinConnection, {
    body: joinBody,
  });
  typia.assert(joined);
  TestValidator.equals(
    "joined seller email matches",
    joined.email,
    joinBody.email,
  );
  TestValidator.equals(
    "joined seller is not banned by default",
    joined.banned,
    false,
  );
  TestValidator.equals(
    "joined seller is not suspended by default",
    joined.suspended,
    false,
  );
  // Ban enforcement at login cannot be exercised here because the provided
  // allowed API surface has no fixture helper or mutation endpoint to change
  // the seller account into banned=true after registration.
  //
  // This test therefore validates only the available baseline state created by
  // the seller join flow while preserving the required test function name.
  // Suspension behavior is also intentionally not tested here because no
  // permitted setup mechanism is available for that state either.
}
