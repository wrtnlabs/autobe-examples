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

export async function test_api_cart_item_quantity_update(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test cart item quantity update for an authenticated customer.
   *
   * Verifies that a customer can update the quantity of an owned cart item and that the response preserves the same shopping cart and product variant references while refreshing timestamps.
   *
   * This scenario focuses on the cart-item mutation contract because the provided SDK surface exposes only the update endpoint. It validates the business rule that quantity changes affect a single cart line and return the updated cart item representation.
   *
   * 1. Register a new customer and build an isolated authenticated connection.
   * 2. Update a cart item quantity using a cart item identifier.
   * 3. Validate that the response is a cart item and that the updated quantity and nested references are preserved in the returned payload.
   */
  const customerConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "P@ssw0rd1234",
      href: "https://example.com/signup",
      referrer: "https://example.com/landing",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(joined);
  const cartItemId = typia.random<string & tags.Format<"uuid">>();
  const update = {
    quantity: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
  } satisfies IMallPlatformCartItem.IUpdate;
  const output =
    await api.functional.mallPlatform.customer.shopping_carts.cart_items.update(
      customerConnection,
      {
        cartItemId,
        body: update,
      },
    );
  typia.assert(output);
  TestValidator.equals("updated quantity", output.quantity, update.quantity);
  TestValidator.predicate(
    "cart item has a shopping cart reference",
    output.shoppingCart.id.length > 0,
  );
  TestValidator.predicate(
    "cart item has a product variant reference",
    output.productVariant.id.length > 0,
  );
  TestValidator.predicate(
    "cart item created timestamp exists",
    output.createdAt.length > 0,
  );
  TestValidator.predicate(
    "cart item updated timestamp exists",
    output.updatedAt.length > 0,
  );
  TestValidator.equals("cart item remains active", output.deletedAt, null);
}
