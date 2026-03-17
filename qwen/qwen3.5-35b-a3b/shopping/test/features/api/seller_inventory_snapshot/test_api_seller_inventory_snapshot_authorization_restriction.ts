import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
import type { IEcommerceMallInventorySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventorySnapshot";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallInventorySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallInventorySnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_seller_inventory_records_create } from "../../../generate/generate_random_ecommerce_mall_seller_inventory_records_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { prepare_random_ecommerce_mall_inventory_record } from "../../../prepare/prepare_random_ecommerce_mall_inventory_record";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";

export async function test_api_seller_inventory_snapshot_authorization_restriction(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Seller A joins and creates product
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerA = await authorize_seller_join(sellerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerA);
  // Use a valid category ID
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  const productA = await generate_random_ecommerce_mall_seller_products_create(
    sellerAConnection,
    {
      body: {
        name: RandomGenerator.name(3),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        category_id: categoryId,
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      },
    },
  );
  typia.assert(productA);
  const variantA =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerAConnection,
      {
        body: {
          sku: RandomGenerator.alphaNumeric(8),
          options: { size: "Large", color: "Red" },
          base_price: productA.base_price + 500,
          stock_quantity: 100,
        },
        params: { productId: productA.id },
      },
    );
  typia.assert(variantA);
  // Step 2: Seller B joins and creates different product
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerB = await authorize_seller_join(sellerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerB);
  const productB = await generate_random_ecommerce_mall_seller_products_create(
    sellerBConnection,
    {
      body: {
        name: RandomGenerator.name(3),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        category_id: categoryId,
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      },
    },
  );
  typia.assert(productB);
  const variantB =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerBConnection,
      {
        body: {
          sku: RandomGenerator.alphaNumeric(8),
          options: { size: "Medium", color: "Blue" },
          base_price: productB.base_price + 500,
          stock_quantity: 50,
        },
        params: { productId: productB.id },
      },
    );
  typia.assert(variantB);
  // Step 3: Seller B creates inventory record
  const inventoryRecordB =
    await generate_random_ecommerce_mall_seller_inventory_records_create(
      sellerBConnection,
      {
        body: {
          ecommerce_mall_product_variant_id: variantB.id,
          quantity_change: 100,
          reason: "Initial restock",
          type: "INCOMING",
        },
      },
    );
  typia.assert(inventoryRecordB);
  // Step 4: Seller B retrieves their own snapshot (should succeed)
  const snapshotsB =
    await api.functional.ecommerceMall.seller.inventory_records.snapshots.index(
      sellerBConnection,
      {
        inventoryRecordId: inventoryRecordB.id,
        body: {},
      },
    );
  typia.assert(snapshotsB);
  TestValidator.equals(
    "snapshots count",
    snapshotsB.data.length,
    snapshotsB.pagination.records,
  );
  if (snapshotsB.data.length === 0) {
    throw new Error("No snapshots created for inventory record");
  }
  const snapshotBId = snapshotsB.data[0].id;
  // Step 5: Seller A attempts to access Seller B's snapshot (already authenticated)
  // Step 6: Validate 403 Forbidden when Seller A tries to access Seller B's snapshot
  await TestValidator.error(
    "seller A cannot access seller B's inventory snapshot",
    async () => {
      await api.functional.ecommerceMall.seller.inventory_records.snapshots.at(
        sellerAConnection,
        {
          inventoryRecordId: inventoryRecordB.id,
          snapshotId: snapshotBId,
        },
      );
    },
  );
}