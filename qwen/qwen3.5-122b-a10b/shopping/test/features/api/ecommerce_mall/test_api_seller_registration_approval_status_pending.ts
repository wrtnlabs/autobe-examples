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

/**
 * Test that newly registered seller accounts are created with pending approval status
 * and cannot perform selling operations until administrator approval.
 *
 * 1. Register a new seller with valid credentials
 * 2. Verify approval_status is 'pending' and account_status is 'active'
 * 3. Verify seller receives JWT tokens and can login with correct credentials
 * 4. Validate seller cannot login with incorrect password
 */
export async function test_api_seller_registration_approval_status_pending(
  connection: api.IConnection,
): Promise<void> {
  // Generate and store registration credentials
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const shopName = RandomGenerator.name();
  // 1. Register new seller with valid credentials
  const sellerConnection: api.IConnection = { host: connection.host };
  const registration = await authorize_seller_join(sellerConnection, {
    body: {
      email,
      password,
      shop_name: shopName,
      shop_description: RandomGenerator.paragraph({ sentences: 3 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(registration);
  // 2. Verify approval_status is 'pending' and account_status is 'active'
  TestValidator.equals(
    "approval status is pending",
    registration.approval_status,
    "pending",
  );
  TestValidator.equals(
    "account status is active",
    registration.account_status,
    "active",
  );
  TestValidator.predicate("has seller ID", registration.seller.id.length > 0);
  TestValidator.predicate("has shop name", registration.shop_name.length > 0);
  TestValidator.equals("shop name matches", registration.shop_name, shopName);
  TestValidator.equals("email matches", registration.seller.email, email);
  // 3. Verify seller can login with correct credentials
  const loginConnection: api.IConnection = { host: connection.host };
  const login = await api.functional.ecommerceMall.auth.seller.login.signIn(
    loginConnection,
    {
      body: {
        email,
        password,
      },
    },
  );
  typia.assert(login);
  TestValidator.equals(
    "login returns seller ID",
    login.seller.id,
    registration.seller.id,
  );
  // 4. Validate seller cannot login with incorrect password
  await TestValidator.error("login fails with wrong password", async () => {
    await api.functional.ecommerceMall.auth.seller.login.signIn(
      loginConnection,
      {
        body: {
          email,
          password: "wrongpassword123!",
        },
      },
    );
  });
  // Note: Product creation and other seller operations require approved status.
  // This test validates the registration and authentication workflow with pending approval.
  // Product creation would be tested in a separate test after admin approval.
}
