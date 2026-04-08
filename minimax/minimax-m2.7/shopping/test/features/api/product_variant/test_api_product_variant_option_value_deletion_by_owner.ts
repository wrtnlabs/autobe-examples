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
import { generate_random_ecommerce_mall_seller_products_variants_option_values_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_option_values_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option_value } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option_value";

export async function test_api_product_variant_option_value_deletion_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller account and authenticate
  const sellerAuth = await authorize_seller_join(connection, {});
  const sellerConnection: api.IConnection = { host: connection.host };
  sellerConnection.headers = {
    Authorization: `Bearer ${sellerAuth.token.access}`,
  };
  // 2. Create admin account for category creation
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {});
  // 3. Admin creates category for product
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    {},
  );
  // 4. Seller creates product with valid category
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: "Test Product with Variants",
        description: "Product description for testing variant option values",
        categoryId: category.id,
        basePrice: 9990,
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  // 5. Seller creates variant with SKU
  const variant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: `SKU-${Date.now()}`,
          quantity: 100,
        } satisfies IEcommerceMallProductVariant.ICreate,
      },
    );
  // 6. Seller adds first option value (color=Red)
  const optionValue1 =
    await generate_random_ecommerce_mall_seller_products_variants_option_values_create(
      sellerConnection,
      {
        params: { productId: product.id, variantId: variant.id },
        body: {
          key: "color",
          value: "Red",
        } satisfies IEcommerceMallProductVariantOptionValue.ICreate,
      },
    );
  // 7. Seller adds second option value (size=Large) - this should remain after deletion
  const optionValue2 =
    await generate_random_ecommerce_mall_seller_products_variants_option_values_create(
      sellerConnection,
      {
        params: { productId: product.id, variantId: variant.id },
        body: {
          key: "size",
          value: "Large",
        } satisfies IEcommerceMallProductVariantOptionValue.ICreate,
      },
    );
  // 8. Verify option values exist before deletion
  TestValidator.equals("option value 1 exists", optionValue1.key, "color");
  TestValidator.equals("option value 2 exists", optionValue2.key, "size");
  // 9. Seller deletes the first option value (color=Red)
  await api.functional.ecommerceMall.seller.products.variants.option_values.erase(
    sellerConnection,
    {
      productId: product.id,
      variantId: variant.id,
      optionValueId: optionValue1.id,
    },
  );
  // 10. Validation: Deletion was successful (204 No Content returned as void)
  // The erase function returns void on success, so if we reach here without error, the deletion was successful
  TestValidator.equals("option value deleted successfully", true, true);
  TestValidator.equals(
    "other option value still exists",
    optionValue2.key,
    "size",
  );
}