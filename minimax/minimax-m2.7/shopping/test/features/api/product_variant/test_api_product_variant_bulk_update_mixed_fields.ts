import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
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
import { generate_random_ecommerce_mall_admin_admin_categories_create } from "../../../generate/generate_random_ecommerce_mall_admin_admin_categories_create";
import { generate_random_ecommerce_mall_seller_sellers_me_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_sellers_me_products_create";
import { generate_random_ecommerce_mall_seller_sellers_me_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_sellers_me_products_variants_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option_value } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option_value";

export async function test_api_product_variant_bulk_update_mixed_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller Registration & Authentication
  const sellerPassword = "TestPassword123!";
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      password: sellerPassword,
    },
  });
  typia.assert(sellerAuth);
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerLoginConnection, {
    body: {
      email: sellerAuth.email,
      password: sellerPassword,
      href: "https://example.com/seller",
      referrer: "https://example.com",
    },
  });
  // 2. Admin creates category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const category =
    await generate_random_ecommerce_mall_admin_admin_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  // 3. Seller creates product
  const product =
    await generate_random_ecommerce_mall_seller_sellers_me_products_create(
      sellerLoginConnection,
      {
        body: {
          categoryId: category.id,
        },
      },
    );
  typia.assert(product);
  // 4. Seller creates two variants
  const variant1 =
    await generate_random_ecommerce_mall_seller_sellers_me_products_variants_create(
      sellerLoginConnection,
      {
        params: {
          productId: product.id,
        },
      },
    );
  typia.assert(variant1);
  const variant2 =
    await generate_random_ecommerce_mall_seller_sellers_me_products_variants_create(
      sellerLoginConnection,
      {
        params: {
          productId: product.id,
        },
      },
    );
  typia.assert(variant2);
  // Record creation timestamps for validation
  const variant1CreatedAt = variant1.createdAt;
  const variant2CreatedAt = variant2.createdAt;
  // 5. Bulk update both variants with mixed fields
  const bulkUpdateResponse =
    await api.functional.ecommerceMall.seller.sellers.me.products.variants.patchByProductid(
      sellerLoginConnection,
      {
        productId: product.id,
        body: {
          items: [
            {
              variantId: variant1.id,
              quantity: 50,
            },
            {
              variantId: variant2.id,
              price: 25000,
            },
          ],
        },
      },
    );
  typia.assert(bulkUpdateResponse);
  // 6. Validations
  // Find the updated variants from response
  const updatedVariant1 = bulkUpdateResponse.variants.find(
    (v) => v.id === variant1.id,
  )!;
  const updatedVariant2 = bulkUpdateResponse.variants.find(
    (v) => v.id === variant2.id,
  )!;
  // Validate variant 1 quantity was updated to 50
  TestValidator.equals(
    "variant 1 quantity updated to 50",
    updatedVariant1.quantity,
    50,
  );
  // Validate variant 2 price was updated to 25000
  TestValidator.equals(
    "variant 2 price updated to 25000",
    updatedVariant2.price,
    25000,
  );
  // Validate timestamps are refreshed (updatedAt should be after createdAt)
  TestValidator.predicate(
    "variant 1 updatedAt refreshed",
    updatedVariant1.updatedAt > variant1CreatedAt,
  );
  TestValidator.predicate(
    "variant 2 updatedAt refreshed",
    updatedVariant2.updatedAt > variant2CreatedAt,
  );
}
