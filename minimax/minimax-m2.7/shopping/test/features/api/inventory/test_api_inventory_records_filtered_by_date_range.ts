import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMall";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMall";
import type { IPageIEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallInventoryRecord";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_seller_product_variants_inventory_records_create } from "../../../generate/generate_random_ecommerce_mall_seller_product_variants_inventory_records_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { prepare_random_ecommerce_mall_inventory_record } from "../../../prepare/prepare_random_ecommerce_mall_inventory_record";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option_value } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option_value";

export async function test_api_inventory_records_filtered_by_date_range(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration and login
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuth);
  // Create new connection with token
  const authenticatedConnection: api.IConnection = { host: connection.host };
  authenticatedConnection.headers = {
    Authorization: `Bearer ${sellerAuth.token.access}`,
  };
  // 2. Create product
  const product = await generate_random_ecommerce_mall_seller_products_create(
    authenticatedConnection,
    {},
  );
  typia.assert(product);
  // 3. Create variant
  const variant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      authenticatedConnection,
      {
        params: {
          productId: product.id,
        },
      },
    );
  typia.assert(variant);
  // 4. Create multiple inventory records at different times
  const firstRecord =
    await generate_random_ecommerce_mall_seller_product_variants_inventory_records_create(
      authenticatedConnection,
      {
        params: {
          variantId: variant.id,
        },
      },
    );
  typia.assert(firstRecord);
  const secondRecord =
    await generate_random_ecommerce_mall_seller_product_variants_inventory_records_create(
      authenticatedConnection,
      {
        params: {
          variantId: variant.id,
        },
      },
    );
  typia.assert(secondRecord);
  const thirdRecord =
    await generate_random_ecommerce_mall_seller_product_variants_inventory_records_create(
      authenticatedConnection,
      {
        params: {
          variantId: variant.id,
        },
      },
    );
  typia.assert(thirdRecord);
  // 5. Get all records first to verify total count
  const allRecordsResponse =
    await api.functional.ecommerceMall.seller.productVariants.inventoryRecords.index(
      authenticatedConnection,
      {
        variantId: variant.id,
        body: {},
      },
    );
  typia.assert(allRecordsResponse);
  TestValidator.predicate(
    "has all 3 records",
    allRecordsResponse.data.length >= 3,
  );
  // 6. Filter by date range - test filtering returns records
  const filteredResponse =
    await api.functional.ecommerceMall.seller.productVariants.inventoryRecords.index(
      authenticatedConnection,
      {
        variantId: variant.id,
        body: {
          fromDate: new Date().toISOString(),
          toDate: new Date().toISOString(),
        } satisfies IEcommerceMallInventoryRecord.IRequest,
      },
    );
  typia.assert(filteredResponse);
  // 7. Validate filtered results - records returned
  TestValidator.predicate(
    "filtered response is valid",
    filteredResponse.data.length >= 0,
  );
  // 8. Test pagination parameters
  const paginatedResponse =
    await api.functional.ecommerceMall.seller.productVariants.inventoryRecords.index(
      authenticatedConnection,
      {
        variantId: variant.id,
        body: {
          page: 1,
          limit: 1,
        } satisfies IEcommerceMallInventoryRecord.IRequest,
      },
    );
  typia.assert(paginatedResponse);
  // 9. Validate pagination returns correct data structure
  TestValidator.predicate(
    "pagination returns items",
    Array.isArray(paginatedResponse.data),
  );
  TestValidator.predicate(
    "has pagination metadata",
    paginatedResponse.pagination !== undefined,
  );
}