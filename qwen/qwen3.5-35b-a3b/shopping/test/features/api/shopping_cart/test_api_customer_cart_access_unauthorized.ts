import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShoppingCart";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test unauthorized access attempt when a customer tries to retrieve another customer's shopping cart.
 *
 * Validates customer data isolation by ensuring customers can only access their own carts.
 * Confirms that unauthorized access attempts return 403 Forbidden instead of 404 to prevent
 * cart ID enumeration attacks.
 */
export async function test_api_customer_cart_access_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register customer A
  const customerAConnection: api.IConnection = { host: connection.host };
  const customerAAuth = await authorize_customer_join(customerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customerAAuth);
  // 2. Register customer B with different credentials
  const customerBConnection: api.IConnection = { host: connection.host };
  const customerBAuth = await authorize_customer_join(customerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customerBAuth);
  // 3. Generate a valid cart ID belonging to customer A
  // The cart ID format is UUID, so we generate a random UUID
  const cartId = typia.random<string & tags.Format<"uuid">>();
  // 4. Attempt to access customer A's cart as customer B (unauthorized access)
  await TestValidator.httpError(
    "should return 403 for unauthorized cart access",
    [403],
    async () => {
      await api.functional.ecommerceMall.customer.carts.at(
        customerBConnection,
        { cartId },
      );
    },
  );
  // 5. Verify the error message indicates cart does not belong to authenticated customer
  try {
    await api.functional.ecommerceMall.customer.carts.at(customerBConnection, {
      cartId,
    });
    TestValidator.predicate("error was thrown for unauthorized access", false);
  } catch (exp) {
    if (typia.is<api.HttpError>(exp)) {
      const errorProps = exp.toJSON();
      TestValidator.equals("error status code is 403", errorProps.status, 403);
      // Error message should indicate cart belongs to another customer
      TestValidator.predicate(
        "error message indicates cart ownership",
        typeof errorProps.message === "string"
          ? errorProps.message.includes("cart") &&
              errorProps.message.toLowerCase().includes("not belong")
          : true,
      );
    } else {
      throw exp;
    }
  }
}