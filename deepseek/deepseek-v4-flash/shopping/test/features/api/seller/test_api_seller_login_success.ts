import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import type { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_login_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Prepare seller credentials
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const password: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();
  const shopName = RandomGenerator.name();
  // 2. Register a new seller account and capture the join result
  const sellerConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_seller_join(sellerConnection, {
    body: {
      email,
      password,
      shop_name: shopName,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(joinResult);
  // 3. Login with the same credentials on a fresh connection
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResult = await authorize_seller_login(loginConnection, {
    body: {
      email,
      password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IECommerceMallSeller.ILogin,
  });
  typia.assert(loginResult);
  // 4. Validate response fields match expectations
  TestValidator.equals("email matches", loginResult.email, email);
  TestValidator.equals(
    "approval status is pending",
    loginResult.approval_status,
    "pending",
  );
  TestValidator.predicate(
    "profile is present",
    () => loginResult.profile !== null,
  );
  TestValidator.equals(
    "profile shop name matches",
    loginResult.profile!.shopName,
    shopName,
  );
  TestValidator.predicate(
    "access token present",
    () => loginResult.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token present",
    () => loginResult.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "deleted_at is null",
    () => loginResult.deleted_at === null,
  );
}
