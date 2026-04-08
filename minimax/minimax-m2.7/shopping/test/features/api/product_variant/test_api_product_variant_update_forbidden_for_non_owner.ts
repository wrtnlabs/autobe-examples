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

export async function test_api_product_variant_update_forbidden_for_non_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as first seller (seller1) and join
  const seller1Connection: api.IConnection = { host: connection.host };
  const seller1Auth = await authorize_seller_join(seller1Connection, {});
  typia.assert(seller1Auth);
  // 2. Admin creates category required for product creation
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const category =
    await generate_random_ecommerce_mall_admin_admin_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  // 3. seller1 creates product and adds variant with SKU 'OWNER-SKU-001'
  const product =
    await generate_random_ecommerce_mall_seller_sellers_me_products_create(
      seller1Connection,
      {
        body: {
          categoryId: category.id,
        },
      },
    );
  typia.assert(product);
  const variant =
    await generate_random_ecommerce_mall_seller_sellers_me_products_variants_create(
      seller1Connection,
      {
        params: {
          productId: product.id,
        },
        body: {
          skuCode: "OWNER-SKU-001",
          optionValues: [{ key: "Color", value: "Blue" }],
        },
      },
    );
  typia.assert(variant);
  // 4. Authenticate as second seller (seller2) and join
  const seller2Connection: api.IConnection = { host: connection.host };
  const seller2Auth = await authorize_seller_join(seller2Connection, {});
  typia.assert(seller2Auth);
  // 5. seller2 attempts to update seller1's variant by productId
  // Expected: 403 Forbidden - seller does not own the product
  await TestValidator.httpError(
    "non-owner cannot update variant (403 Forbidden)",
    403,
    async () =>
      await api.functional.ecommerceMall.seller.sellers.me.products.variants.putByProductidAndVariantid(
        seller2Connection,
        {
          productId: product.id,
          variantId: variant.id,
          body: {
            skuCode: "HACKED-SKU-001",
            price: 9999,
          } satisfies IEcommerceMallProductVariant.IUpdate,
        },
      ),
  );
}
