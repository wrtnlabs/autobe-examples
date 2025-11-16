import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCartItem";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import type { IShoppingMallSaleSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleSku";
import type { IShoppingMallSaleVariantAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleVariantAttribute";
import type { IShoppingMallSaleVariantValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleVariantValue";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test cart isolation between multiple buyers to ensure proper multi-tenancy.
 *
 * This test validates that shopping cart items are completely isolated between
 * different buyer accounts, ensuring critical data privacy and security
 * requirements. Each buyer must only be able to access and view their own cart
 * items, with no possibility of seeing other buyers' cart contents.
 *
 * Test workflow:
 *
 * 1. Create necessary infrastructure (admin, category, seller, products)
 * 2. Create three independent buyer accounts
 * 3. Each buyer adds different products to their cart
 * 4. Verify each buyer retrieves only their own cart items
 * 5. Confirm accurate cart item counts per buyer
 */
export async function test_api_cart_isolation_between_buyers(
  connection: api.IConnection,
) {
  // Step 1: Create admin account for category management
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
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

  // Step 2: Create product category
  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        slug: RandomGenerator.alphaNumeric(10),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        display_order: typia.random<number & tags.Type<"int32">>(),
        status: "active",
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);

  // Step 3: Create seller account for product sales
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: typia.random<string & tags.MinLength<8>>(),
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      business_name: RandomGenerator.paragraph({ sentences: 2 }),
      business_description: RandomGenerator.paragraph({ sentences: 5 }),
      store_name: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);

  // Step 4: Create product sales (3 products for variety)
  const products = await ArrayUtil.asyncRepeat(3, async (index) => {
    const sale = await api.functional.shoppingMall.seller.sales.create(
      connection,
      {
        body: {
          code: `PROD-${RandomGenerator.alphaNumeric(8)}`,
          shopping_mall_category_id: category.id,
          title: RandomGenerator.paragraph({ sentences: 3 }),
          description: RandomGenerator.content({ paragraphs: 2 }),
          condition: RandomGenerator.pick([
            "new",
            "refurbished",
            "used",
          ] as const),
          return_policy_days: RandomGenerator.pick([0, 7, 14, 30, 60] as const),
        } satisfies IShoppingMallSale.ICreate,
      },
    );
    typia.assert(sale);
    return sale;
  });

  // Step 5: Create SKUs for each product
  const skus = await ArrayUtil.asyncMap(products, async (product) => {
    const sku = await api.functional.shoppingMall.seller.sales.skus.create(
      connection,
      {
        saleCode: product.code,
        body: {
          sku_code: `SKU-${RandomGenerator.alphaNumeric(8)}`,
          variant_combination: JSON.stringify({ size: "M", color: "Blue" }),
          base_price: typia.random<number & tags.Minimum<0>>(),
          enabled: true,
        } satisfies IShoppingMallSaleSku.ICreate,
      },
    );
    typia.assert(sku);
    return sku;
  });

  // Step 6: Create three buyer accounts with stored passwords
  const buyerPassword = typia.random<string & tags.MinLength<8>>();
  const buyers = await ArrayUtil.asyncRepeat(3, async (index) => {
    const buyerEmail = typia.random<string & tags.Format<"email">>();
    const buyer = await api.functional.auth.buyer.join(connection, {
      body: {
        email: buyerEmail,
        password: buyerPassword,
        full_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallBuyer.ICreate,
    });
    typia.assert(buyer);
    return { buyer, email: buyerEmail, password: buyerPassword };
  });

  // Step 7: Each buyer adds different products to their cart
  // Buyer 1 adds product 0
  await api.functional.auth.buyer.login(connection, {
    body: {
      email: buyers[0].email,
      password: buyers[0].password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallBuyer.ILogin,
  });

  const buyer1CartItem =
    await api.functional.shoppingMall.buyer.buyers.me.cart.items.create(
      connection,
      {
        body: {
          shopping_mall_sale_sku_id: skus[0].id,
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
        } satisfies IShoppingMallCartItem.ICreate,
      },
    );
  typia.assert(buyer1CartItem);

  // Buyer 2 adds product 1
  await api.functional.auth.buyer.login(connection, {
    body: {
      email: buyers[1].email,
      password: buyers[1].password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallBuyer.ILogin,
  });

  const buyer2CartItem =
    await api.functional.shoppingMall.buyer.buyers.me.cart.items.create(
      connection,
      {
        body: {
          shopping_mall_sale_sku_id: skus[1].id,
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
        } satisfies IShoppingMallCartItem.ICreate,
      },
    );
  typia.assert(buyer2CartItem);

  // Buyer 3 adds product 2
  await api.functional.auth.buyer.login(connection, {
    body: {
      email: buyers[2].email,
      password: buyers[2].password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallBuyer.ILogin,
  });

  const buyer3CartItem =
    await api.functional.shoppingMall.buyer.buyers.me.cart.items.create(
      connection,
      {
        body: {
          shopping_mall_sale_sku_id: skus[2].id,
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
        } satisfies IShoppingMallCartItem.ICreate,
      },
    );
  typia.assert(buyer3CartItem);

  // Step 8: Verify Buyer 1's cart contains only their item
  await api.functional.auth.buyer.login(connection, {
    body: {
      email: buyers[0].email,
      password: buyers[0].password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallBuyer.ILogin,
  });

  const buyer1Cart =
    await api.functional.shoppingMall.buyer.buyers.me.cart.index(connection, {
      body: {} satisfies IShoppingMallCartItem.IRequest,
    });
  typia.assert(buyer1Cart);

  TestValidator.equals("buyer 1 cart count", buyer1Cart.pagination.records, 1);
  TestValidator.equals(
    "buyer 1 cart item SKU",
    buyer1Cart.data[0].shopping_mall_sale_sku_id,
    skus[0].id,
  );

  // Step 9: Verify Buyer 2's cart contains only their item
  await api.functional.auth.buyer.login(connection, {
    body: {
      email: buyers[1].email,
      password: buyers[1].password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallBuyer.ILogin,
  });

  const buyer2Cart =
    await api.functional.shoppingMall.buyer.buyers.me.cart.index(connection, {
      body: {} satisfies IShoppingMallCartItem.IRequest,
    });
  typia.assert(buyer2Cart);

  TestValidator.equals("buyer 2 cart count", buyer2Cart.pagination.records, 1);
  TestValidator.equals(
    "buyer 2 cart item SKU",
    buyer2Cart.data[0].shopping_mall_sale_sku_id,
    skus[1].id,
  );

  // Step 10: Verify Buyer 3's cart contains only their item
  await api.functional.auth.buyer.login(connection, {
    body: {
      email: buyers[2].email,
      password: buyers[2].password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallBuyer.ILogin,
  });

  const buyer3Cart =
    await api.functional.shoppingMall.buyer.buyers.me.cart.index(connection, {
      body: {} satisfies IShoppingMallCartItem.IRequest,
    });
  typia.assert(buyer3Cart);

  TestValidator.equals("buyer 3 cart count", buyer3Cart.pagination.records, 1);
  TestValidator.equals(
    "buyer 3 cart item SKU",
    buyer3Cart.data[0].shopping_mall_sale_sku_id,
    skus[2].id,
  );
}
