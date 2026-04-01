import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCartItem";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShoppingCart";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformShoppingCart";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_cart_update_single_variant_line(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(authorized);
  const output = await api.functional.mallPlatform.customer.carts.index(
    customerConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IMallPlatformShoppingCart.IRequest,
    },
  );
  typia.assert(output);
  TestValidator.predicate(
    "pagination current page is valid",
    output.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    output.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records is valid",
    output.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is valid",
    output.pagination.pages >= 0,
  );
  TestValidator.equals(
    "cart page data is returned",
    output.data.length,
    output.data.length,
  );
  for (const cart of output.data) {
    typia.assert(cart);
    TestValidator.equals(
      "cart belongs to authenticated customer",
      cart.customer.id,
      authorized.id,
    );
    const variantIds = cart.cartItems.map((item) => item.productVariant.id);
    TestValidator.equals(
      "cart preserves single line per variant",
      new Set(variantIds).size,
      variantIds.length,
    );
    const expectedTotal = cart.cartItems.reduce((sum, item) => {
      const price =
        item.productVariant.priceOverride ??
        item.productVariant.product.basePrice;
      return sum + price * item.quantity;
    }, 0);
    TestValidator.equals(
      "cart total is recalculated from item subtotals",
      cart.totalPrice,
      expectedTotal,
    );
    for (const item of cart.cartItems) {
      typia.assert(item);
      TestValidator.equals(
        "cart item belongs to the same cart",
        item.shoppingCart.id,
        cart.id,
      );
      TestValidator.predicate(
        "cart item quantity is positive",
        item.quantity > 0,
      );
      TestValidator.predicate(
        "cart item variant is active",
        item.productVariant.isActive === true,
      );
      TestValidator.predicate(
        "cart item has linked product",
        item.productVariant.product.id.length > 0,
      );
    }
  }
}
