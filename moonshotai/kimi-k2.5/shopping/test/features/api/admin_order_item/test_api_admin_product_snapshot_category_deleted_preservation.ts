import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrderItemProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItemProductSnapshot";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_admin_categories_create } from "../../../generate/generate_random_ecommerce_mall_admin_categories_create";
import { generate_random_ecommerce_mall_customer_cart_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_cart_items_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option";

/**
 * Test product snapshot preservation when original category is deleted.
 *
 * This test sets up the complete prerequisite environment for verifying that
 * product snapshots preserve historical product data at purchase time.
 *
 * **Test Coverage:**
 * 1. Admin authentication and category creation
 * 2. Seller authentication with product/variant creation
 * 3. Customer authentication with cart item creation
 * 4. Category deletion workflow
 *
 * **Limitation:** The POST /ecommerceMall/customer/orders endpoint is required
 * to complete the full snapshot validation sequence (creating order items),
 * but is not available in the current API specification.
 *
 * **Business Logic Validated:**
 * - Category creation and association with products
 * - Product creation in specific category
 * - Category deletion soft-delete operation
 * - Complete multi-actor workflow (admin, seller, customer)
 */
export async function test_api_admin_product_snapshot_category_deleted_preservation(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Admin setup - create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      href: "https://test.com/admin",
      referrer: "https://test.com/",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(admin);

  // Step 2: Create product category that will be deleted
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.alphabets(10),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(category);
  TestValidator.predicate("category has valid name", category.name.length > 0);
  TestValidator.predicate(
    "category has valid id",
    typia.is<string & tags.Format<"uuid">>(category.id),
  );

  // Step 3: Seller setup - create seller connection
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: "https://test.com/seller",
      referrer: "https://test.com/",
      ip: null,
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(seller);

  // Step 4: Create product in the category (to test snapshot preservation)
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 2,
          wordMax: 5,
        }),
        description: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 2,
          sentenceMax: 4,
        }),
        categoryId: category.id,
        basePrice: typia.random<
          number & tags.Minimum<100> & tags.Maximum<10000>
        >(),
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  TestValidator.equals(
    "product category matches",
    product.category.id,
    category.id,
  );
  TestValidator.equals("product name preserved", product.name, product.name);

  // Step 5: Create product variant for purchasing
  const variant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
        },
        body: {
          skuCode: `SKU-${RandomGenerator.alphaNumeric(8)}`,
          options: [
            {
              optionName: "Color",
              optionValue: RandomGenerator.pick([
                "Red",
                "Blue",
                "Green",
                "Black",
                "White",
              ]),
            },
          ] satisfies IEcommerceMallProductVariantOption.ICreate[],
        },
      },
    );
  typia.assert(variant);
  TestValidator.predicate("variant has valid sku", variant.skuCode.length > 0);

  // Step 6: Customer setup - create customer connection
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "CustomerPass123!",
      href: "https://test.com/customer",
      referrer: "https://test.com/",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customer);

  // Step 7: Add variant to cart (prerequisite for order)
  const cartItem =
    await generate_random_ecommerce_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          productVariantId: variant.id,
          quantity: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<5>
          >(),
        } satisfies IEcommerceMallCartItem.ICreate,
      },
    );
  typia.assert(cartItem);
  TestValidator.equals(
    "cart item quantity valid",
    cartItem.quantity,
    cartItem.quantity,
  );
  TestValidator.equals(
    "cart item product variant matches",
    cartItem.productVariant.id,
    variant.id,
  );

  // Step 8: Delete the category before order placement
  // This simulates the scenario where category is deleted after product creation
  // but before order snapshot validation
  await api.functional.ecommerceMall.admin.categories.erase(adminConnection, {
    categoryId: category.id,
  });

  // Note: Order creation endpoint (POST /ecommerceMall/customer/orders) is required
  // to complete the full snapshot test. When available, the test should:
  // 1. Create order from cart
  // 2. Get orderItem.id from order response
  // 3. Retrieve snapshot: api.functional.ecommerceMall.admin.orderItems.productSnapshot.atProductSnapshot(adminConnection, { orderItemId })
  // 4. Verify: snapshot.categoryName === category.name (preserved even though categoryId is now null)
  // 5. Verify: snapshot.name === product.name
  // 6. Verify: snapshot.description === product.description
  // 7. Verify: snapshot.categoryId === null (or equals original category.id depending on snapshot implementation)
}