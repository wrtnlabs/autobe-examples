import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";

/**
 * Test the successful retrieval of a specific inventory record for a product variant.
 *
 * Steps:
 * 1. Seller authenticates via join
 * 2. Seller creates a product
 * 3. Seller creates a variant with initial stock quantity
 * 4. Generate inventory record for testing (since no restocking endpoint is available)
 * 5. Seller queries the specific inventory record by variantId and recordId
 * 6. Validate the response contains the correct inventory record
 */
export async function test_api_seller_variant_inventory_record_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Seller joins account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(sellerAuthorized);
  // Step 2: Seller creates a product
  const product: IEcommerceMallProduct =
    await generate_random_ecommerce_mall_seller_products_create(
      sellerConnection,
      {},
    );
  typia.assert(product);
  // Step 3: Seller creates a variant for the product
  const variant: IEcommerceMallProductVariant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        body: {
          sku_code: typia.random<string & tags.MaxLength<50>>(),
          option_values: {
            size: "Large",
            color: "Red",
          },
          stock_quantity: 0,
        },
        params: {
          productId: product.id,
        },
      },
    );
  typia.assert(variant);
  // Step 4: Generate a mock inventory record (no restocking endpoint available)
  // Create a record with this variantId to test retrieval
  const mockInventoryRecord: IEcommerceMallInventoryRecord = {
    id: typia.random<string & tags.Format<"uuid">>(),
    variant_id: variant.id,
    quantity_change: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1>
    >(),
    reason: "restocking",
    timestamp: new Date().toISOString(),
  };
  // Step 5: Retrieve the inventory record using the variantId and recordId
  const retrievedRecord: IEcommerceMallInventoryRecord =
    await api.functional.ecommerceMall.seller.variants.inventoryRecords.at(
      sellerConnection,
      {
        variantId: variant.id,
        recordId: mockInventoryRecord.id,
      },
    );
  typia.assert(retrievedRecord);
  // Step 6: Validate the retrieved record with business logic tests
  TestValidator.equals(
    "variant_id matches created variant",
    retrievedRecord.variant_id,
    variant.id,
  );
  TestValidator.equals(
    "quantity_change is positive for restocking",
    retrievedRecord.quantity_change > 0,
    true,
  );
  TestValidator.equals(
    "reason matches restocking",
    retrievedRecord.reason,
    "restocking",
  );
  TestValidator.equals(
    "timestamp is valid ISO 8601 format",
    /[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.\d{3}Z/.test(retrievedRecord.timestamp),
    true,
  );
}