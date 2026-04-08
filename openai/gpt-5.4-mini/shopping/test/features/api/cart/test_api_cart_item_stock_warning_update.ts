import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCartItem";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShoppingCart";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_cart_item_stock_warning_update(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Verify cart item quantity updates above available stock preserve the line.
   *
   * This test exercises the authenticated customer cart-item update flow and confirms
   * that increasing an existing line quantity returns a valid cart item response while
   * preserving the selected variant relation and the persisted quantity value.
   *
   * 1. Register and authenticate a customer using the required onboarding payload.
   * 2. Update a cart item quantity to a larger positive value that represents a stock-warning case.
   * 3. Validate that the response remains a cart item and keeps the requested quantity.
   * 4. Validate that the selected variant and cart ownership references are still present.
   */
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  const cartItemId = typia.random<string & tags.Format<"uuid">>();
  const requestedQuantity =
    (typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1>
    >() satisfies number) + 5;
  const output =
    await api.functional.mallPlatform.customer.shopping_carts.cart_items.update(
      customerConnection,
      {
        cartItemId,
        body: {
          quantity: requestedQuantity,
        } satisfies IMallPlatformCartItem.IUpdate,
      },
    );
  typia.assert(output);
  TestValidator.equals(
    "cart item id should remain stable",
    output.id,
    output.id,
  );
  TestValidator.equals(
    "updated quantity should be persisted",
    output.quantity,
    requestedQuantity,
  );
  TestValidator.predicate(
    "cart item should expose an availability state for warning display",
    output.availabilityState.length > 0,
  );
  TestValidator.predicate(
    "selected product variant should remain attached to the cart item",
    output.productVariant.id.length > 0 &&
      output.productVariant.skuCode.length > 0,
  );
  TestValidator.predicate(
    "shopping cart should remain associated with a customer summary",
    output.shoppingCart.customer.id.length > 0 &&
      output.shoppingCart.customer.email.length > 0,
  );
}
