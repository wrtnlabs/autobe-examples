import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IParentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IParentReference";
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
import { prepare_random_ecommerce_mall_product_image } from "../../../prepare/prepare_random_ecommerce_mall_product_image";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option";

/**
 * Test retrieving a specific cart item by its ID as an authenticated customer.
 *
 * Business Workflow:
 * 1. Customer authenticates and joins the platform
 * 2. An admin creates a category
 * 3. A seller creates a product in that category
 * 4. The seller creates a product variant with stock
 * 5. The customer adds the variant to their cart
 * 6. The customer retrieves the specific cart item by ID
 *
 * Test Validation Points:
 * - Successful retrieval returns IEcommerceMallCartItem with complete details
 * - Response includes product name, variant options (e.g., Color, Size), unitPrice, quantity, subtotal
 * - Availability status is computed correctly based on variant existence and stock
 * - Timestamps (createdAt, updatedAt) are in ISO 8601 format
 * - Embedded product summary and seller information are populated
 * - Cart item correctly linked to customer via JWT authentication
 */
export async function test_api_customer_cart_item_retrieve_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer authenticates and joins the platform
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Admin creates a category
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "AdminPass123!",
      href: "https://example.com/admin",
      referrer: "https://example.com/",
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(admin);
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    {
      body: {
        name: `Category ${RandomGenerator.alphabets(8)}`,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        parentId: null,
      } satisfies IEcommerceMallCategory.ICreate,
    },
  );
  typia.assert(category);
  // 3. Seller creates a product in that category
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SellerPass123!",
      href: "https://example.com/seller",
      referrer: "https://example.com/",
      ip: "127.0.0.1",
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(seller);
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: `Product ${RandomGenerator.name()}`,
        description: RandomGenerator.content({ paragraphs: 3 }),
        categoryId: category.id,
        basePrice: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 4. Seller creates a product variant with stock
  const variant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: `SKU-${RandomGenerator.alphaNumeric(8).toUpperCase()}`,
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
            {
              optionName: "Size",
              optionValue: RandomGenerator.pick(["S", "M", "L", "XL"]),
            },
          ],
          price: typia.random<
            number & tags.Minimum<500> & tags.Type<"uint32">
          >(),
          stock: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<10> & tags.Maximum<100>
          >(),
        } satisfies IEcommerceMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // 5. Customer adds the variant to their cart
  const cartItem =
    await generate_random_ecommerce_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          productVariantId: variant.id,
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
          >(),
        } satisfies IEcommerceMallCartItem.ICreate,
      },
    );
  typia.assert(cartItem);
  // 6. Customer retrieves the specific cart item by ID
  const retrievedCartItem =
    await api.functional.ecommerceMall.customer.cartItems.at(
      customerConnection,
      { cartItemId: cartItem.id },
    );
  typia.assert(retrievedCartItem);
  // Validation: Ensure retrieved cart item matches the created one
  TestValidator.equals("cart item ID", retrievedCartItem.id, cartItem.id);
  TestValidator.equals(
    "quantity",
    retrievedCartItem.quantity,
    cartItem.quantity,
  );
  TestValidator.equals(
    "unitPrice",
    retrievedCartItem.unitPrice,
    cartItem.unitPrice,
  );
  TestValidator.equals(
    "subtotal",
    retrievedCartItem.subtotal,
    cartItem.subtotal,
  );
  TestValidator.equals(
    "isAvailable",
    retrievedCartItem.isAvailable,
    cartItem.isAvailable,
  );
  TestValidator.equals(
    "product variant ID",
    retrievedCartItem.productVariant.id,
    cartItem.productVariant.id,
  );
  TestValidator.equals(
    "product name",
    retrievedCartItem.product.name,
    cartItem.product.name,
  );
  // Validate computed properties
  TestValidator.predicate(
    "subtotal calculation",
    retrievedCartItem.subtotal ===
      retrievedCartItem.unitPrice * retrievedCartItem.quantity,
  );
  TestValidator.predicate(
    "product has seller",
    typeof retrievedCartItem.product.seller === "object" &&
      retrievedCartItem.product.seller.id !== undefined,
  );
  TestValidator.predicate(
    "product has category",
    typeof retrievedCartItem.product.category === "object" &&
      retrievedCartItem.product.category.id !== undefined,
  );
}