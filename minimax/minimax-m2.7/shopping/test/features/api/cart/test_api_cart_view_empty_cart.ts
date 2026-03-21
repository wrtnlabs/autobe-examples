import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import type { IEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlistItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_cart_view_empty_cart(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new customer via POST /ecommerceMall/auth/customer/join
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(customer);
  // 2. Call GET /ecommerceMall/customer/customers/cart without adding any items
  const cart =
    await api.functional.ecommerceMall.customer.customers.cart.at(
      customerConnection,
    );
  typia.assert(cart);
  // 3. Verify response returns a valid cart structure with id, customer summary, items array (empty), and total (0)
  TestValidator.equals("cart has valid id", typeof cart.id, "string");
  TestValidator.equals(
    "cart has customer summary",
    typeof cart.customer,
    "object",
  );
  TestValidator.equals("customer id matches", cart.customer.id, customer.id);
  TestValidator.equals(
    "customer email matches",
    cart.customer.email,
    customer.email,
  );
  TestValidator.equals("items array exists and is empty", cart.items.length, 0);
  TestValidator.equals("total is 0", cart.total, 0);
  // 4. Verify the cart persists and remains associated with the customer across subsequent requests
  const cartAgain =
    await api.functional.ecommerceMall.customer.customers.cart.at(
      customerConnection,
    );
  typia.assert(cartAgain);
  TestValidator.equals("cart id persists", cartAgain.id, cart.id);
  TestValidator.equals(
    "cart customer persists",
    cartAgain.customer.id,
    cart.customer.id,
  );
  TestValidator.equals("items still empty", cartAgain.items.length, 0);
  TestValidator.equals("total still 0", cartAgain.total, 0);
  // 5. Verify business rule: each customer has exactly one cart enforced - calling again returns same cart
  const cartThird =
    await api.functional.ecommerceMall.customer.customers.cart.at(
      customerConnection,
    );
  typia.assert(cartThird);
  TestValidator.equals(
    "same cart returned on multiple calls",
    cartThird.id,
    cart.id,
  );
  TestValidator.equals(
    "cart customer association unchanged",
    cartThird.customer.id,
    customer.id,
  );
}
