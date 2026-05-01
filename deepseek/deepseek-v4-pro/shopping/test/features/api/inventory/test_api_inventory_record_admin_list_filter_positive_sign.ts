import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallInventoryRecord";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import type { IShoppingMallReviewReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewReview";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
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
import { generate_random_shopping_mall_admin_categories_create } from "../../../generate/generate_random_shopping_mall_admin_categories_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_product_variant_option_value } from "../../../prepare/prepare_random_shopping_mall_product_variant_option_value";

/**
 * Test that an administrator can filter inventory records by the positive sign.
 *
 * Validates the inventory record sign filter by creating a variant with initial
 * stock — which generates a positive restock inventory record — then listing
 * inventory records with the sign filter set to "positive". Confirms that only
 * records with quantity_change greater than zero are returned, the initial
 * stock record is present and matches the provided quantity, and pagination
 * metadata accurately reflects the filtered result count rather than any
 * hypothetical total record count.
 *
 * 1. Administrator registers and authenticates via join.
 * 2. Administrator creates a product category.
 * 3. Seller registers and authenticates via join.
 * 4. Administrator approves the seller to enable selling.
 * 5. Seller creates a product under the category.
 * 6. Seller creates a variant with initial stock, generating a positive record.
 * 7. Administrator lists inventory records filtered by sign "positive".
 * 8. Validates all records have positive quantity_change, the initial stock
 *    record is present with its correct value, and pagination matches.
 */
export async function test_api_inventory_record_admin_list_filter_positive_sign(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create category
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // 3. Seller registration
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  // 4. Admin approves seller
  await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
    sellerId: seller.id,
  });
  // 5. Seller creates product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        shopping_mall_category_id: category.id,
      },
    },
  );
  typia.assert(product);
  // 6. Seller creates variant with initial stock (positive inventory record)
  const initialStock = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
  >();
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: { initialStockQuantity: initialStock },
      },
    );
  typia.assert(variant);
  // 7. Admin lists inventory records filtered by positive sign
  const result =
    await api.functional.shoppingMall.admin.products.variants.inventory_records.index(
      adminConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          sign: "positive",
        } satisfies IShoppingMallInventoryRecord.IRequest,
      },
    );
  typia.assert(result);
  // 8. Validate that only positive records are returned
  TestValidator.predicate(
    "at least one positive inventory record exists",
    result.data.length > 0,
  );
  for (const record of result.data) {
    TestValidator.predicate(
      `record ${record.id} has positive quantity_change`,
      record.quantity_change > 0,
    );
  }
  // 9. Validate initial stock record is present with correct quantity
  const initialRecord = result.data.find(
    (r) => r.quantity_change === initialStock,
  );
  TestValidator.predicate(
    "initial stock record present with correct quantity_change",
    initialRecord !== undefined,
  );
  // 10. Validate pagination metadata reflects filtered count
  TestValidator.equals(
    "pagination records count matches filtered data length",
    result.pagination.records,
    result.data.length,
  );
}
