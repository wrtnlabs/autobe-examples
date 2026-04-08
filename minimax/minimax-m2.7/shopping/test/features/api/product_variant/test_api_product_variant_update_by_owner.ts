import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotVariant";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_admin_categories_create } from "../../../generate/generate_random_ecommerce_mall_admin_categories_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option_value } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option_value";

export async function test_api_product_variant_update_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin creates a top-level category for product assignment
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      actorType: "seller",
      requestedGrade: "admin",
      reason: "Need admin access for e2e testing purposes",
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    },
  });
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    {
      body: {
        name: "Electronics",
        description: "Electronic products and gadgets",
      },
    },
  );
  typia.assert(category);
  // 2. Seller registers via join endpoint
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    },
  });
  typia.assert(sellerAuth);
  // 3. Seller creates a product in that category
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: "Test Product",
        description: "A test product for variant testing",
        categoryId: category.id,
        basePrice: 100.0,
      },
    },
  );
  typia.assert(product);
  // 4. Seller creates a product variant with initial SKU 'VAR-001', price 50.00, and quantity 10
  const initialVariant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: "VAR-001",
          price: 50.0,
          quantity: 10,
        },
      },
    );
  typia.assert(initialVariant);
  // Verify initial variant state
  TestValidator.equals("initial SKU code", initialVariant.skuCode, "VAR-001");
  TestValidator.equals("initial price", initialVariant.price, 50.0);
  TestValidator.equals("initial quantity", initialVariant.quantity, 10);
  TestValidator.equals(
    "initial inventoryCount",
    initialVariant.inventoryCount,
    10,
  );
  // 5. Seller updates the variant via PUT with new skuCode 'VAR-001-UPDATED', price 75.00, and quantity 20
  const updatedVariant =
    await api.functional.ecommerceMall.seller.products.variants.update(
      sellerConnection,
      {
        productId: product.id,
        variantId: initialVariant.id,
        body: {
          skuCode: "VAR-001-UPDATED",
          price: 75.0,
          quantity: 20,
        } satisfies IEcommerceMallProductVariant.IUpdate,
      },
    );
  typia.assert(updatedVariant);
  // Validation: verify 200 OK response, returned variant has updated values
  TestValidator.equals(
    "updated SKU code",
    updatedVariant.skuCode,
    "VAR-001-UPDATED",
  );
  TestValidator.equals("updated price", updatedVariant.price, 75.0);
  TestValidator.equals("updated quantity", updatedVariant.quantity, 20);
  TestValidator.equals(
    "updated inventoryCount",
    updatedVariant.inventoryCount,
    20,
  );
  // Verify product reference is correct
  TestValidator.equals(
    "product reference id",
    updatedVariant.product.id,
    product.id,
  );
  TestValidator.equals(
    "product reference name",
    updatedVariant.product.name,
    product.name,
  );
}
