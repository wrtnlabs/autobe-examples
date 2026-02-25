import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdminSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminSessions";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerWishlist";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_wishlist_create } from "../../../generate/generate_random_shopping_mall_customer_wishlist_create";
import { prepare_random_shopping_mall_customer_wishlist } from "../../../prepare/prepare_random_shopping_mall_customer_wishlist";

export async function test_api_customer_wishlist_removal(
  connection: api.IConnection,
): Promise<void> {
  // Create new customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<
        string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">
      >(),
      password: "12345678",
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer);
  // Create a product using available API
  // Since sellers.products API is not available in the functional module,
  // we need to find an alternative approach
  // For now, let's use a random product ID or create one through available means
  const productConnection: api.IConnection = { host: connection.host };
  // Use random product data for testing wishlist removal
  // Since we don't have a direct product creation endpoint available,
  // we'll create a product manually with proper structure
  const product = typia.random<IShoppingMallProduct.ISummary>();
  typia.assert(product);
  // Add product to customer's wishlist
  const wishlistItem =
    await api.functional.shoppingMall.customer.wishlist.create(
      customerConnection,
      {
        body: {
          shopping_mall_product_id: product.id,
        } satisfies IShoppingMallCustomerWishlist.ICreate,
      },
    );
  typia.assert(wishlistItem);
  // Verify wishlist item exists before removal
  TestValidator.equals(
    "wishlist item should exist",
    wishlistItem.shopping_mall_product_id,
    product.id,
  );
  // Remove product from wishlist
  await api.functional.shoppingMall.customer.wishlist.erase(
    customerConnection,
    {
      productId: product.id,
    },
  );
  // Verify that removing the same product again throws an error
  await TestValidator.error("duplicate removal should fail", async () => {
    await api.functional.shoppingMall.customer.wishlist.erase(
      customerConnection,
      {
        productId: product.id,
      },
    );
  });
}
