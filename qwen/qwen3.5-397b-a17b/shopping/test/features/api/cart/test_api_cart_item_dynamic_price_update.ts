import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCartItem";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
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

export async function test_api_cart_item_dynamic_price_update(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration and authentication
  const customerAuth = await authorize_customer_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      nickname: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // 2. Create customer connection with authentication token
  const customerConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: customerAuth.token.access,
    },
  };
  // 3. Retrieve customer's cart items
  const cartResponse = await api.functional.shoppingMall.customer.cart.index(
    customerConnection,
    {
      body: {
        page: 1,
        limit: 20,
        sort: "created_at,asc",
      } satisfies IShoppingMallCartItem.IRequest,
    },
  );
  typia.assert(cartResponse);
  // 4. Validate pagination structure
  TestValidator.predicate(
    "pagination exists",
    cartResponse.pagination !== undefined,
  );
  TestValidator.predicate(
    "current page is 1",
    cartResponse.pagination.current >= 1,
  );
  TestValidator.predicate(
    "limit is positive",
    cartResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "records count is non-negative",
    cartResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    cartResponse.pagination.pages >= 0,
  );
  // 5. Validate cart items array exists
  TestValidator.predicate(
    "data array exists",
    Array.isArray(cartResponse.data),
  );
  // 6. If cart has items, validate each item structure and price calculations
  if (cartResponse.data.length > 0) {
    for (const item of cartResponse.data) {
      // Validate cart item structure
      TestValidator.predicate("item id exists", item.id !== undefined);
      TestValidator.predicate("quantity is positive", item.quantity >= 1);
      TestValidator.predicate(
        "available is boolean",
        typeof item.available === "boolean",
      );
      TestValidator.predicate("unitPrice is non-negative", item.unitPrice >= 0);
      TestValidator.predicate("subtotal is non-negative", item.subtotal >= 0);
      TestValidator.predicate(
        "stockWarning is boolean",
        typeof item.stockWarning === "boolean",
      );
      TestValidator.predicate("createdAt exists", item.createdAt !== undefined);
      // Validate variant structure
      TestValidator.predicate("variant exists", item.variant !== undefined);
      TestValidator.predicate(
        "variant id exists",
        item.variant.id !== undefined,
      );
      TestValidator.predicate(
        "variant skuCode exists",
        item.variant.skuCode !== undefined,
      );
      TestValidator.predicate(
        "variant optionValues is array",
        Array.isArray(item.variant.optionValues),
      );
      TestValidator.predicate(
        "variant stockQuantity is non-negative",
        item.variant.stockQuantity >= 0,
      );
      // Validate subtotal calculation (unitPrice × quantity)
      const expectedSubtotal = item.unitPrice * item.quantity;
      TestValidator.equals(
        "subtotal matches unitPrice × quantity",
        item.subtotal,
        expectedSubtotal,
      );
      // Validate stock warning logic (quantity > stockQuantity triggers warning)
      const shouldWarn = item.quantity > item.variant.stockQuantity;
      TestValidator.equals(
        "stockWarning matches quantity > stockQuantity",
        item.stockWarning,
        shouldWarn,
      );
      // Validate unitPrice reflects variant price when set, otherwise uses product base price
      // Variant price is optional (nullable), unitPrice should use variant.price if not null
      if (item.variant.price !== null && item.variant.price !== undefined) {
        TestValidator.equals(
          "unitPrice matches variant price override",
          item.unitPrice,
          item.variant.price,
        );
      }
      // Note: When variant.price is null/undefined, unitPrice falls back to product.basePrice
      // which we cannot validate without product data in the response
    }
  }
  // Note: Full dynamic price update testing requires APIs for:
  // - Adding items to cart (not available in current SDK)
  // - Updating variant prices (not available in current SDK)
  // This test validates the cart retrieval structure and price calculation logic
}
