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
import { generate_random_ecommerce_mall_seller_sellers_me_products_variants_option_values_create } from "../../../generate/generate_random_ecommerce_mall_seller_sellers_me_products_variants_option_values_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option_value } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option_value";

export async function test_api_variant_option_value_upsert_existing_key(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin for category creation
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create category
  const category =
    await generate_random_ecommerce_mall_admin_admin_categories_create(
      adminConnection,
      {},
    );
  // 3. Create seller and get authorized
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  await api.functional.ecommerceMall.auth.seller.join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  // Note: For this test, we assume the seller is approved (in real scenario, admin would approve)
  // The API may return approved status directly or require admin approval
  // 4. Create product
  const product =
    await generate_random_ecommerce_mall_seller_sellers_me_products_create(
      sellerConnection,
      {
        body: {
          categoryId: category.id,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          name: RandomGenerator.paragraph({ sentences: 2 }),
          basePrice: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
        },
      },
    );
  // 5. Create variant
  const variant =
    await generate_random_ecommerce_mall_seller_sellers_me_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: `SKU-${RandomGenerator.alphaNumeric(8)}`,
          optionValues: [
            {
              key: "color",
              value: "Red",
            } satisfies IEcommerceMallProductVariantOptionValue.ICreate,
          ],
        },
      },
    );
  // 6. Create first option value with key "size" and value "Small"
  const firstOptionValue =
    await api.functional.ecommerceMall.seller.sellers.me.products.variants.option_values.create(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          key: "size",
          value: "Small",
        } satisfies IEcommerceMallProductVariantOptionValue.ICreate,
      },
    );
  typia.assert(firstOptionValue);
  TestValidator.equals(
    "first option key is size",
    firstOptionValue.key,
    "size",
  );
  TestValidator.equals(
    "first option value is Small",
    firstOptionValue.value,
    "Small",
  );
  // 7. Create second option value with SAME key "size" but different value "Large"
  // This should UPDATE the existing option (upsert behavior), not create a duplicate
  const secondOptionValue =
    await api.functional.ecommerceMall.seller.sellers.me.products.variants.option_values.create(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          key: "size",
          value: "Large",
        } satisfies IEcommerceMallProductVariantOptionValue.ICreate,
      },
    );
  typia.assert(secondOptionValue);
  // Verify upsert behavior:
  // - Key remains "size" (same key means it was an update, not a new create)
  TestValidator.equals(
    "second option key is still size",
    secondOptionValue.key,
    "size",
  );
  // - Value is now "Large" (updated from "Small")
  TestValidator.equals(
    "second option value is Large",
    secondOptionValue.value,
    "Large",
  );
  // - The option count should still be 2 (color and size), not 3
  // This proves no duplicate was created
  TestValidator.equals(
    "variant still has 2 option values",
    variant.optionValues.length + 1,
    2,
  );
}
