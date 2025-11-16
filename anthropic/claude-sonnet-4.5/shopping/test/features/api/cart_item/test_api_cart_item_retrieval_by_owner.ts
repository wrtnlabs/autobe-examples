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

export async function test_api_cart_item_retrieval_by_owner(
  connection: api.IConnection,
) {
  // Phase 1: Multi-Actor Authentication Setup

  // Step 1: Create and authenticate buyer account
  const buyerEmail = typia.random<string & tags.Format<"email">>();
  const buyer: IShoppingMallBuyer.IAuthorized =
    await api.functional.auth.buyer.join(connection, {
      body: {
        email: buyerEmail,
        password: "SecurePass123!",
        full_name: "John Buyer",
        phone_number: "+821012345678",
        href: "https://marketplace.example.com/cart",
        referrer: "https://marketplace.example.com/products",
      } satisfies IShoppingMallBuyer.ICreate,
    });
  typia.assert(buyer);

  // Step 2: Create and authenticate admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPass123!",
        full_name: "Admin User",
        phone_number: "+821087654321",
        admin_level: "super_admin",
        email_verified: true,
        href: "https://admin.marketplace.example.com/dashboard",
        referrer: "https://admin.marketplace.example.com/login",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 3: Create and authenticate seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: "SellerPass123!",
        full_name: "Jane Seller",
        phone_number: "+821055556666",
        business_name: "Premium Electronics Store Inc.",
        business_description:
          "Leading provider of high-quality consumer electronics with over 10 years of expertise in the industry. We specialize in laptops, smartphones, and accessories with exceptional customer service.",
        store_name: "TechStore Premium",
        href: "https://seller.marketplace.example.com/register",
        referrer: "https://seller.marketplace.example.com/info",
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller);

  // Phase 2: Product Catalog Setup

  // Step 4: Admin creates product category
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        name: "Electronics",
        slug: "electronics",
        description:
          "Consumer electronics including laptops, smartphones, tablets, and accessories",
        display_order: 1,
        status: "active",
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(category);

  // Step 5: Switch to seller and create product sale listing
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: "SellerPass123!",
      href: "https://seller.marketplace.example.com/dashboard",
      referrer: "https://seller.marketplace.example.com/login",
    } satisfies IShoppingMallSeller.ILogin,
  });

  const saleCode = `PROD-${RandomGenerator.alphaNumeric(8).toUpperCase()}`;
  const sale: IShoppingMallSale =
    await api.functional.shoppingMall.seller.sales.create(connection, {
      body: {
        code: saleCode,
        shopping_mall_category_id: category.id,
        title: "Premium Wireless Bluetooth Headphones",
        description:
          "High-quality wireless headphones with active noise cancellation, 30-hour battery life, premium comfort padding, and crystal-clear audio quality. Perfect for music lovers, travelers, and professionals who demand the best audio experience.",
        brand: "AudioPro",
        condition: "new",
        short_description:
          "Premium wireless headphones with noise cancellation and 30-hour battery life",
        return_policy_days: 30,
        warranty_info:
          "2-year manufacturer warranty covering defects in materials and workmanship",
      } satisfies IShoppingMallSale.ICreate,
    });
  typia.assert(sale);

  // Step 6: Create SKU variant for the product
  const skuCode = `${saleCode}-BLACK-STD`;
  const sku: IShoppingMallSaleSku =
    await api.functional.shoppingMall.seller.sales.skus.create(connection, {
      saleCode: saleCode,
      body: {
        sku_code: skuCode,
        variant_combination: JSON.stringify({
          Color: "Black",
          Size: "Standard",
        }),
        base_price: 149.99,
        enabled: true,
      } satisfies IShoppingMallSaleSku.ICreate,
    });
  typia.assert(sku);

  // Phase 3: Cart Item Creation

  // Step 7: Switch back to buyer account
  await api.functional.auth.buyer.login(connection, {
    body: {
      email: buyerEmail,
      password: "SecurePass123!",
      href: "https://marketplace.example.com/products/headphones",
      referrer: "https://marketplace.example.com/search",
    } satisfies IShoppingMallBuyer.ILogin,
  });

  // Step 8: Buyer adds product SKU to cart
  const addedCartItem: IShoppingMallCartItem =
    await api.functional.shoppingMall.buyer.buyers.me.cart.items.create(
      connection,
      {
        body: {
          shopping_mall_sale_sku_id: sku.id,
          quantity: 2,
        } satisfies IShoppingMallCartItem.ICreate,
      },
    );
  typia.assert(addedCartItem);

  // Phase 4: Cart Item Retrieval and Validation

  // Step 9: Retrieve the cart item by its ID
  const retrievedCartItem: IShoppingMallCartItem =
    await api.functional.shoppingMall.buyer.buyers.me.cart.items.at(
      connection,
      {
        cartItemId: addedCartItem.id,
      },
    );
  typia.assert(retrievedCartItem);

  // Phase 5: Data Integrity Validation

  // Step 10: Validate cart item ID consistency
  TestValidator.equals(
    "retrieved cart item ID matches created item",
    retrievedCartItem.id,
    addedCartItem.id,
  );

  // Step 11: Validate buyer ownership
  TestValidator.equals(
    "cart item belongs to authenticated buyer",
    retrievedCartItem.shopping_mall_buyer_id,
    buyer.id,
  );

  // Step 12: Validate SKU reference integrity
  TestValidator.equals(
    "cart item references correct SKU",
    retrievedCartItem.shopping_mall_sale_sku_id,
    sku.id,
  );

  // Step 13: Validate quantity accuracy
  TestValidator.equals(
    "cart item quantity matches requested amount",
    retrievedCartItem.quantity,
    2,
  );

  // Step 14: Validate price snapshot correctness
  TestValidator.equals(
    "unit price snapshot captured correctly",
    retrievedCartItem.unit_price_snapshot,
    sku.base_price,
  );

  // Step 15: Validate timestamps are present
  TestValidator.predicate(
    "cart item has creation timestamp",
    retrievedCartItem.created_at !== null &&
      retrievedCartItem.created_at !== undefined,
  );

  TestValidator.predicate(
    "cart item has update timestamp",
    retrievedCartItem.updated_at !== null &&
      retrievedCartItem.updated_at !== undefined,
  );

  // Step 16: Validate soft deletion status (should be null for active item)
  TestValidator.equals(
    "cart item is not deleted",
    retrievedCartItem.deleted_at,
    null,
  );
}
