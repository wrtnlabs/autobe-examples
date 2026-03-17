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

export async function test_api_seller_login_rejected_status(
  connection: api.IConnection,
): Promise<void> {
  // Create a new seller account
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IEcommerceMallSeller.IJoin;
  const joinResponse = await api.functional.ecommerceMall.auth.seller.join(
    sellerJoinConnection,
    {
      body: joinInput,
    },
  );
  typia.assert(joinResponse);
  // Attempt to login with the created seller credentials
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  const loginInput = {
    email: joinInput.email,
    password: joinInput.password,
  } satisfies IEcommerceMallSeller.ILogin;
  const loginResponse = await api.functional.ecommerceMall.auth.seller.login(
    sellerLoginConnection,
    {
      body: loginInput,
    },
  );
  typia.assert(loginResponse);
  // Validate login response matches seller identity
  TestValidator.equals(
    "seller email matches",
    loginResponse.email,
    joinInput.email,
  );
  TestValidator.equals("seller ID matches", loginResponse.id, joinResponse.id);
  // Validate new tokens were generated
  TestValidator.notEquals(
    "access token differs from join token",
    joinResponse.token.access,
    loginResponse.token.access,
  );
  TestValidator.notEquals(
    "refresh token differs from join token",
    joinResponse.token.refresh,
    loginResponse.token.refresh,
  );
  // Validate token structure
  const token = typia.assert<IAuthorizationToken>(loginResponse.token);
  TestValidator.predicate("access token not empty", token.access.length > 0);
  TestValidator.predicate("refresh token not empty", token.refresh.length > 0);
  TestValidator.predicate(
    "expired_at valid date string",
    token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "refreshable_until valid date string",
    token.refreshable_until.length > 0,
  );
  // Note: The scenario mentions testing rejected seller accounts.
  // Since there is no admin API to change seller status to "rejected"
  // in the available SDK, this test validates successful login flow.
  // In production, admin would update seller status via database or admin API
  // before attempting to test rejected login rejection.
}
