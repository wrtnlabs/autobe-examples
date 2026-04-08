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

export async function test_api_product_variant_update_duplicate_sku_rejection(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - create admin account for category creation
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  await authorize_admin_login(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  // 2. Create category 'Footwear'
  const category =
    await api.functional.ecommerceMall.admin.admin.categories.create(
      adminConnection,
      {
        body: {
          name: "Footwear",
          description: "Shoes and footwear products",
        } satisfies IEcommerceMallCategory.ICreate,
      },
    );
  typia.assert(category);
  // 3. Seller setup - join and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  await authorize_seller_login(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.ILogin,
  });
  // 4. Seller creates product 'Running Shoes' with basePrice 89.99
  const product =
    await api.functional.ecommerceMall.seller.sellers.me.products.create(
      sellerConnection,
      {
        body: {
          name: "Running Shoes",
          description: RandomGenerator.paragraph({ sentences: 3 }),
          basePrice: 89.99,
          categoryId: category.id,
        } satisfies IEcommerceMallProduct.ICreate,
      },
    );
  typia.assert(product);
  // 5. Seller creates first variant with skuCode 'SHOE-BLACK-42'
  const firstVariant =
    await api.functional.ecommerceMall.seller.sellers.me.products.variants.create(
      sellerConnection,
      {
        productId: product.id,
        body: {
          skuCode: "SHOE-BLACK-42",
          optionValues: [
            { key: "color", value: "Black" },
            { key: "size", value: "42" },
          ] satisfies IEcommerceMallProductVariantOptionValue.ICreate[],
        } satisfies IEcommerceMallProductVariant.ICreate,
      },
    );
  typia.assert(firstVariant);
  // 6. Seller creates second variant with skuCode 'SHOE-WHITE-42'
  const secondVariant =
    await api.functional.ecommerceMall.seller.sellers.me.products.variants.create(
      sellerConnection,
      {
        productId: product.id,
        body: {
          skuCode: "SHOE-WHITE-42",
          optionValues: [
            { key: "color", value: "White" },
            { key: "size", value: "42" },
          ] satisfies IEcommerceMallProductVariantOptionValue.ICreate[],
        } satisfies IEcommerceMallProductVariant.ICreate,
      },
    );
  typia.assert(secondVariant);
  // 7. Seller attempts to update second variant with duplicate skuCode 'SHOE-BLACK-42'
  await TestValidator.error(
    "duplicate SKU code should return error",
    async () => {
      await api.functional.ecommerceMall.seller.sellers.me.products.variants.patchByProductidAndVariantid(
        sellerConnection,
        {
          productId: product.id,
          variantId: secondVariant.id,
          body: {
            skuCode: "SHOE-BLACK-42",
          } satisfies IEcommerceMallProductVariant.IUpdate,
        },
      );
    },
  );
  // 8. Verify second variant still has original skuCode 'SHOE-WHITE-42'
  TestValidator.equals(
    "second variant SKU unchanged",
    secondVariant.skuCode,
    "SHOE-WHITE-42",
  );
}
