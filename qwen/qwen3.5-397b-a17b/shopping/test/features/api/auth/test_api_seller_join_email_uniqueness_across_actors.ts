import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test seller registration email uniqueness validation across different actor types.
 *
 * This test validates the cross-actor email uniqueness business rule that prevents
 * the same email from being used for both customer and seller accounts.
 *
 * Test flow:
 * 1. Create a customer account with a specific email
 * 2. Attempt to register a seller account with the same email
 * 3. Verify seller registration is rejected with appropriate error
 * 4. Verify no seller account was created
 */
export async function test_api_seller_join_email_uniqueness_across_actors(
  connection: api.IConnection,
): Promise<void> {
  // Generate a unique email for this test
  const testEmail = typia.random<string & tags.Format<"email">>();
  const testPassword = RandomGenerator.alphaNumeric(16);
  // Step 1: Create a customer account with the test email
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: testEmail,
      password: testPassword,
      nickname: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer);
  // Verify customer was created successfully
  TestValidator.equals("customer email matches", customer.email, testEmail);
  // Step 2: Attempt to create a seller account with the same email
  const sellerConnection: api.IConnection = { host: connection.host };
  // This should fail due to email uniqueness constraint
  await TestValidator.error(
    "seller registration with duplicate email should fail",
    async () => {
      await api.functional.shoppingMall.auth.seller.join(sellerConnection, {
        body: {
          email: testEmail,
          password: testPassword,
          shop_name: RandomGenerator.name(),
          shop_description: RandomGenerator.paragraph(),
          logo_image_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies IShoppingMallSeller.IJoin,
      });
    },
  );
  // Step 3: Verify that a different email works for seller registration
  const differentEmail = typia.random<string & tags.Format<"email">>();
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: differentEmail,
      password: testPassword,
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph(),
      logo_image_url: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);
  // Verify seller was created with different email
  TestValidator.equals(
    "seller email is different",
    seller.email,
    differentEmail,
  );
  TestValidator.notEquals("emails are unique", customer.email, seller.email);
}
