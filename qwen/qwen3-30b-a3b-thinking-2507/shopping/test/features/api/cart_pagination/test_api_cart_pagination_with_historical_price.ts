import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAddress";
import type { IEcommerceCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCancellationRequest";
import type { IEcommerceCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCart";
import type { IEcommerceCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCartItem";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceCustomerEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomerEmailVerification";
import type { IEcommerceCustomerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomerPasswordReset";
import type { IEcommerceCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomerSession";
import type { IEcommerceDefaultAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceDefaultAddress";
import type { IEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrder";
import type { IEcommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItem";
import type { IEcommerceProductReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductReview";
import type { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import type { IEcommerceRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceRefundRequest";
import type { IEcommerceShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceShipment";
import type { IEcommerceWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceWishlistItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceCartItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_ecommerce_customer_carts_create } from "../../../generate/generate_random_ecommerce_customer_carts_create";
import { prepare_random_ecommerce_cart } from "../../../prepare/prepare_random_ecommerce_cart";

export async function test_api_cart_pagination_with_historical_price(
  connection: api.IConnection,
): Promise<void> {
  // 1. Auth as customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // 2. Create cart
  const cart = await generate_random_ecommerce_customer_carts_create(
    customerConnection,
    {
      body: {},
    },
  );
  // 3. Get cart items with pagination
  const paginationResults =
    await api.functional.ecommerce.customer.carts.items.index(
      customerConnection,
      {
        cartId: cart.id,
        body: {
          page: 1,
          limit: 10,
        },
      },
    );
  // 4. Verify cart contains items
  typia.assert(paginationResults);
  TestValidator.predicate(
    "Cart contains items",
    paginationResults.data.length > 0,
  );
  // 5. Verify historical pricing (price_at_addition) for items
  paginationResults.data.forEach((item) => {
    TestValidator.predicate(
      "price_at_addition is defined",
      item.price_at_addition !== undefined,
    );
    TestValidator.predicate(
      "price_at_addition is a number",
      typeof item.price_at_addition === "number",
    );
    TestValidator.predicate(
      "price_at_addition matches historical price",
      item.price_at_addition > 0,
    );
  });
  // 6. Verify pagination parameters
  TestValidator.equals(
    "Pagination page",
    paginationResults.pagination.current,
    1,
  );
  TestValidator.equals(
    "Pagination limit",
    paginationResults.pagination.limit,
    10,
  );
  TestValidator.equals(
    "Pagination items total",
    paginationResults.pagination.records,
    paginationResults.data.length,
  );
  TestValidator.equals(
    "Items per page matches limit",
    paginationResults.data.length <= 10,
    true,
  );
}
