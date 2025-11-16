import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import type { IShoppingMallSaleSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleSku";
import type { IShoppingMallSaleVariantAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleVariantAttribute";
import type { IShoppingMallSaleVariantValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleVariantValue";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

export async function test_api_cart_item_retrieval_with_variant_details(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate buyer account
  const buyerEmail = typia.random<string & tags.Format<"email">>();
  const buyerPassword = typia.random<string & tags.MinLength<8>>();
  const buyer: IShoppingMallBuyer.IAuthorized =
    await api.functional.auth.buyer.join(connection, {
      body: {
        email: buyerEmail,
        password: buyerPassword,
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallBuyer.ICreate,
    });
  typia.assert(buyer);

  // Step 2: Create and authenticate admin account for category management
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        admin_level: "super_admin",
        email_verified: true,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 3: Create product category
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        name: RandomGenerator.name(),
        slug: RandomGenerator.alphaNumeric(10),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        display_order: typia.random<number & tags.Type<"int32">>(),
        status: "active",
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(category);

  // Step 4: Create and authenticate seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: typia.random<string & tags.MinLength<8>>(),
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        business_name: RandomGenerator.name(2),
        business_description: RandomGenerator.paragraph({ sentences: 10 }),
        store_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller);

  // Step 5: Create product sale
  const sale: IShoppingMallSale =
    await api.functional.shoppingMall.seller.sales.create(connection, {
      body: {
        code: RandomGenerator.alphaNumeric(12),
        shopping_mall_category_id: category.id,
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 3 }),
        condition: "new",
        return_policy_days: 30,
      } satisfies IShoppingMallSale.ICreate,
    });
  typia.assert(sale);

  // Step 6: Create SKU with specific variant combination
  const variantCombination = {
    Color: "Red",
    Size: "Large",
  };
  const sku: IShoppingMallSaleSku =
    await api.functional.shoppingMall.seller.sales.skus.create(connection, {
      saleCode: sale.code,
      body: {
        sku_code: RandomGenerator.alphaNumeric(10),
        variant_combination: JSON.stringify(variantCombination),
        base_price: typia.random<number & tags.Minimum<0>>(),
        enabled: true,
      } satisfies IShoppingMallSaleSku.ICreate,
    });
  typia.assert(sku);
  TestValidator.equals(
    "SKU variant combination matches",
    sku.variant_combination,
    JSON.stringify(variantCombination),
  );

  // Step 7: Switch back to buyer authentication
  await api.functional.auth.buyer.login(connection, {
    body: {
      email: buyerEmail,
      password: buyerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallBuyer.ILogin,
  });

  // Step 8: Add SKU to cart
  const cartItem: IShoppingMallCartItem =
    await api.functional.shoppingMall.buyer.buyers.me.cart.items.create(
      connection,
      {
        body: {
          shopping_mall_sale_sku_id: sku.id,
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
        } satisfies IShoppingMallCartItem.ICreate,
      },
    );
  typia.assert(cartItem);

  // Step 9: Retrieve cart item details
  const retrievedCartItem: IShoppingMallCartItem =
    await api.functional.shoppingMall.buyer.buyers.me.cart.items.at(
      connection,
      {
        cartItemId: cartItem.id,
      },
    );
  typia.assert(retrievedCartItem);

  // Step 10: Validate cart item details
  TestValidator.equals(
    "cart item ID matches",
    retrievedCartItem.id,
    cartItem.id,
  );
  TestValidator.equals(
    "cart item SKU reference matches",
    retrievedCartItem.shopping_mall_sale_sku_id,
    sku.id,
  );
  TestValidator.equals(
    "cart item quantity matches",
    retrievedCartItem.quantity,
    cartItem.quantity,
  );
  TestValidator.predicate(
    "cart item has unit price snapshot",
    retrievedCartItem.unit_price_snapshot > 0,
  );
}
