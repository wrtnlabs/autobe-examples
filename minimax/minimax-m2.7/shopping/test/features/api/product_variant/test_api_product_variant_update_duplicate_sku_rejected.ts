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

export async function test_api_product_variant_update_duplicate_sku_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin creates a top-level category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      actorType: "seller",
      requestedGrade: "admin",
      reason: "Need admin access for testing product variant SKU uniqueness",
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // 2. Seller registers and logs in
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    } satisfies IEcommerceMallSeller.IJoin,
  });
  // 3. Seller creates Product A with Variant 1 (SKU 'VAR-ONE')
  const productA = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: "Product A",
        description: "Description for Product A",
        categoryId: category.id,
        basePrice: 10000,
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(productA);
  const variant1 =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        body: {
          skuCode: "VAR-ONE",
          quantity: 10,
          price: 10000,
        } satisfies IEcommerceMallProductVariant.ICreate,
        params: { productId: productA.id },
      },
    );
  typia.assert(variant1);
  TestValidator.equals("Variant 1 SKU is VAR-ONE", variant1.skuCode, "VAR-ONE");
  // 4. Seller creates Product B with Variant 2 (SKU 'VAR-TWO')
  const productB = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: "Product B",
        description: "Description for Product B",
        categoryId: category.id,
        basePrice: 20000,
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(productB);
  const variant2 =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        body: {
          skuCode: "VAR-TWO",
          quantity: 20,
          price: 20000,
        } satisfies IEcommerceMallProductVariant.ICreate,
        params: { productId: productB.id },
      },
    );
  typia.assert(variant2);
  TestValidator.equals("Variant 2 SKU is VAR-TWO", variant2.skuCode, "VAR-TWO");
  // 5. Seller attempts to update Variant 2 with duplicate SKU 'VAR-ONE'
  await TestValidator.error("duplicate SKU should be rejected", async () => {
    await api.functional.ecommerceMall.seller.products.variants.update(
      sellerConnection,
      {
        productId: productB.id,
        variantId: variant2.id,
        body: {
          skuCode: "VAR-ONE",
        } satisfies IEcommerceMallProductVariant.IUpdate,
      },
    );
  });
}
