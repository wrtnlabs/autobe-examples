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
import { generate_random_ecommerce_mall_customer_cart_create } from "../../../generate/generate_random_ecommerce_mall_customer_cart_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_image } from "../../../prepare/prepare_random_ecommerce_mall_product_image";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option";

export async function test_api_cart_duplicate_variant_quantity_combined(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer setup - create authenticated customer connection
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 2. Admin setup - create authenticated admin connection for category creation
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 3. Create category for product classification
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // 4. Seller setup - create authenticated seller connection
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 5. Create product under the created category
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        categoryId: category.id,
      },
    },
  );
  typia.assert(product);
  // 6. Create variant with sufficient stock to support quantity combination testing
  const variant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
        },
        body: {
          stock: 100, // Ensure sufficient stock for quantity combination
        },
      },
    );
  typia.assert(variant);
  // 7. First cart addition: add variant with quantity 2
  const firstCartItem = await api.functional.ecommerceMall.customer.cart.create(
    customerConnection,
    {
      body: {
        productVariantId: variant.id,
        quantity: 2,
      } satisfies IEcommerceMallCartItem.ICreate,
    },
  );
  typia.assert(firstCartItem);
  // Validate initial state
  TestValidator.equals("initial quantity", firstCartItem.quantity, 2);
  TestValidator.equals(
    "initial subtotal",
    firstCartItem.subtotal,
    firstCartItem.unitPrice * 2,
  );
  // 8. Second cart addition: add same variant with quantity 3 (should combine)
  const secondCartItem =
    await api.functional.ecommerceMall.customer.cart.create(
      customerConnection,
      {
        body: {
          productVariantId: variant.id,
          quantity: 3,
        } satisfies IEcommerceMallCartItem.ICreate,
      },
    );
  typia.assert(secondCartItem);
  // 9. Business rule validations
  // Quantities should be combined (2 + 3 = 5)
  TestValidator.equals("combined quantity", secondCartItem.quantity, 5);
  // Should be the same cart item (update, not new creation)
  TestValidator.equals(
    "same cart item id",
    secondCartItem.id,
    firstCartItem.id,
  );
  // Subtotal should be recalculated based on combined quantity
  const expectedSubtotal = secondCartItem.unitPrice * 5;
  TestValidator.equals(
    "recalculated subtotal",
    secondCartItem.subtotal,
    expectedSubtotal,
  );
  // Product variant should be the same
  TestValidator.equals(
    "same variant",
    secondCartItem.productVariant.id,
    variant.id,
  );
  // Verify timestamps exist and updatedAt is present
  TestValidator.predicate("createdAt exists", !!secondCartItem.createdAt);
  TestValidator.predicate("updatedAt exists", !!secondCartItem.updatedAt);
}
