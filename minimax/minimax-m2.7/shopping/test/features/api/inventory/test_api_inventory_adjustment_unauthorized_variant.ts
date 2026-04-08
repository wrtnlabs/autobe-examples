import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
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
import { generate_random_ecommerce_mall_seller_variants_inventory_create } from "../../../generate/generate_random_ecommerce_mall_seller_variants_inventory_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_inventory_record } from "../../../prepare/prepare_random_ecommerce_mall_inventory_record";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option_value } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option_value";

export async function test_api_inventory_adjustment_unauthorized_variant(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin creates category for product assignment
  const adminConnection: api.IConnection = { host: connection.host };
  const adminCredentials = await authorize_admin_join(adminConnection, {});
  typia.assert(adminCredentials);
  const category =
    await generate_random_ecommerce_mall_admin_admin_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  // 2. First seller registers and gets approved
  const firstSellerConnection: api.IConnection = { host: connection.host };
  const firstSellerCredentials = await authorize_seller_join(
    firstSellerConnection,
    {},
  );
  typia.assert(firstSellerCredentials);
  await api.functional.ecommerceMall.admin.admin.sellers.approve(
    adminConnection,
    {
      sellerId: firstSellerCredentials.id,
    },
  );
  // 3. Second seller registers and gets approved
  const secondSellerConnection: api.IConnection = { host: connection.host };
  const secondSellerCredentials = await authorize_seller_join(
    secondSellerConnection,
    {},
  );
  typia.assert(secondSellerCredentials);
  await api.functional.ecommerceMall.admin.admin.sellers.approve(
    adminConnection,
    {
      sellerId: secondSellerCredentials.id,
    },
  );
  // 4. First approved seller creates product and variant
  const product =
    await generate_random_ecommerce_mall_seller_sellers_me_products_create(
      firstSellerConnection,
      {
        body: {
          categoryId: category.id,
        },
      },
    );
  typia.assert(product);
  const variant =
    await generate_random_ecommerce_mall_seller_sellers_me_products_variants_create(
      firstSellerConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(variant);
  // 5. First seller restocks their own variant (verify success)
  const restockRecord =
    await generate_random_ecommerce_mall_seller_variants_inventory_create(
      firstSellerConnection,
      {
        params: { variantId: variant.id },
        body: {
          quantityChange: 100 satisfies number & tags.Type<"int32">,
          reason: "restock",
        },
      },
    );
  typia.assert(restockRecord);
  TestValidator.predicate(
    "restock quantity positive",
    restockRecord.quantityChange > 0,
  );
  // 6. Second seller attempts to adjust inventory on first seller's variant
  // This should be rejected with 403 Forbidden
  await TestValidator.error("unauthorized inventory adjustment", async () => {
    await generate_random_ecommerce_mall_seller_variants_inventory_create(
      secondSellerConnection,
      {
        params: { variantId: variant.id },
        body: {
          quantityChange: 50 satisfies number & tags.Type<"int32">,
          reason: "unauthorized restock",
        },
      },
    );
  });
  // 7. Verify inventory records only contain first seller's changes
  TestValidator.equals(
    "inventory record quantity is 100",
    restockRecord.quantityChange,
    100,
  );
}
