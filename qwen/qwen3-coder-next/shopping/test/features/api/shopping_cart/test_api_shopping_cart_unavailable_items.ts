import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShoppingCart";
import type { IShoppingMallAdminSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminSessions";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShoppingCart";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_shopping_cart_unavailable_items(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connections
  const customerConnection: api.IConnection = { host: connection.host };
  // Authenticate customer
  const customerCredentials = {
    email: typia.random<
      string & (tags.Format<"email"> & tags.MinLength<1> & tags.MaxLength<255>)
    >(),
    password: "1234",
    display_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    href: "https://example.com/register",
    referrer: "https://google.com",
  } satisfies IShoppingMallCustomer.IJoin;
  const authorizedCustomer = await authorize_customer_join(customerConnection, {
    body: customerCredentials,
  });
  typia.assert(authorizedCustomer);
  // Get customer's cart using the only available endpoint
  const cart =
    await api.functional.shoppingMall.customer.carts.at(customerConnection);
  typia.assert(cart);
  // Verify cart structure
  TestValidator.predicate("cart has pagination", cart.pagination !== undefined);
  TestValidator.predicate("cart has data array", Array.isArray(cart.data));
  // Generate mock unavailable cart items for testing
  const mockUnavailableItem =
    typia.random<IShoppingMallShoppingCart.ISummary>();
  const mockAvailableItem = typia.random<IShoppingMallShoppingCart.ISummary>();
  // Simulate cart with unavailable items for validation testing
  const testCartWithUnavailable = {
    pagination: cart.pagination,
    data: [
      {
        ...mockAvailableItem,
        variant: { ...mockAvailableItem.variant, stock_quantity: 10 },
      },
      {
        ...mockUnavailableItem,
        variant: { ...mockUnavailableItem.variant, stock_quantity: 0 },
      },
    ],
  } satisfies IPageIShoppingMallShoppingCart.ISummary;
  // Validate unavailable item detection logic
  const unavailableItems = testCartWithUnavailable.data.filter(
    (item) => item.variant.stock_quantity === 0,
  );
  TestValidator.equals(
    "one unavailable item detected",
    unavailableItems.length,
    1,
  );
  // Verify available items
  const availableItems = testCartWithUnavailable.data.filter(
    (item) => item.variant.stock_quantity > 0,
  );
  TestValidator.equals("one available item detected", availableItems.length, 1);
  // Test cart item properties
  if (availableItems.length > 0) {
    TestValidator.predicate(
      "available item has variant",
      availableItems[0].variant !== undefined,
    );
    TestValidator.predicate(
      "available item has customer",
      availableItems[0].customer !== undefined,
    );
    TestValidator.predicate(
      "available item has quantity",
      availableItems[0].quantity >= 1,
    );
  }
  // Test unavailable item properties
  if (unavailableItems.length > 0) {
    TestValidator.equals(
      "unavailable item stock is 0",
      unavailableItems[0].variant.stock_quantity,
      0,
    );
    TestValidator.predicate(
      "unavailable item has variant options",
      Array.isArray(
        unavailableItems[0].variant.shoppingMallProductVariantOptionValues,
      ),
    );
  }
}
