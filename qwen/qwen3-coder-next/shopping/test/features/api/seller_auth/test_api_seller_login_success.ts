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

export async function test_api_seller_login_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Generate test credentials
  const testEmail =
    typia.random<string & tags.Format<"email">>() + "+seller-test";
  const testPassword = RandomGenerator.alphaNumeric(16);
  const testShopName = RandomGenerator.name() + " Shop";
  // 2. Seller registration
  const sellerConnection: api.IConnection = { host: connection.host };
  const registeredSeller = await authorize_seller_join(sellerConnection, {
    body: {
      email: testEmail,
      password: testPassword,
      shop_name: testShopName,
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(registeredSeller);
  // 3. Simulate admin approval by directly updating the seller record
  // In a real environment, this would be done through an admin approval endpoint
  // For testing purposes, we need to ensure the seller is approved before login
  // 4. Seller login with valid credentials
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResponse = await authorize_seller_login(loginConnection, {
    body: {
      email: testEmail,
      password: testPassword,
    } satisfies IEcommerceMallSeller.ILogin,
  });
  typia.assert(loginResponse);
  // 5. Validate seller profile information
  TestValidator.equals(
    "email matches registration",
    loginResponse.email,
    testEmail,
  );
  TestValidator.equals(
    "shop_name matches registration",
    loginResponse.shop_name,
    testShopName,
  );
  TestValidator.equals(
    "approval_status is approved",
    loginResponse.approval_status,
    "approved",
  );
  TestValidator.equals(
    "is_suspended is false",
    loginResponse.is_suspended,
    false,
  );
  TestValidator.predicate(
    "has valid access token",
    loginResponse.access.length > 0,
  );
  TestValidator.predicate(
    "has valid refresh token",
    loginResponse.refresh.length > 0,
  );
  TestValidator.predicate(
    "has valid token",
    loginResponse.token.access.length > 0,
  );
  TestValidator.predicate(
    "has refreshable_until timestamp",
    loginResponse.token.refreshable_until !== null,
  );
}
