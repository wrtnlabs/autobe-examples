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

export async function test_api_seller_inventory_snapshot_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller joins the platform
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Seller@1234",
      href: "https://seller.example.com/join",
      referrer: "https://example.com",
    },
  });
  typia.assert(seller);
  // Create authenticated connection with seller's token
  const authenticatedSellerConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: seller.token.access,
    },
  };
  // 2. Seller creates a product
  const category: IEcommerceMallCategory.ISummary =
    typia.random<IEcommerceMallCategory.ISummary>();
  const product = await generate_random_ecommerce_mall_seller_products_create(
    authenticatedSellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        category_id: category.id,
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      },
    },
  );
  typia.assert(product);
  // 3. Seller creates a variant for the product
  const variant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      authenticatedSellerConnection,
      {
        body: {
          sku: RandomGenerator.alphaNumeric(12),
          options: { size: "Large", color: "Blue" },
          base_price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
          stock_quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
        },
        params: { productId: product.id },
      },
    );
  typia.assert(variant);
  // 4. Seller creates an inventory record for the variant
  const inventoryRecord =
    await generate_random_ecommerce_mall_seller_inventory_records_create(
      authenticatedSellerConnection,
      {
        body: {
          ecommerce_mall_product_variant_id: variant.id,
          quantity_change: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
          reason: "Restock from supplier",
          type: "INCOMING",
        },
      },
    );
  typia.assert(inventoryRecord);
  // 5. Seller retrieves snapshots list to get a snapshotId
  const snapshotsPage =
    await api.functional.ecommerceMall.seller.inventory_records.snapshots.index(
      authenticatedSellerConnection,
      {
        inventoryRecordId: inventoryRecord.id,
        body: {
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
          page: 1,
        },
      },
    );
  typia.assert(snapshotsPage);
  // Verify we have at least one snapshot
  TestValidator.predicate(
    "inventory record has snapshots",
    snapshotsPage.data.length > 0,
  );
  // Get the first snapshot ID
  const snapshotId = snapshotsPage.data[0].id;
  // 6. Seller retrieves specific snapshot
  const snapshot =
    await api.functional.ecommerceMall.seller.inventory_records.snapshots.at(
      authenticatedSellerConnection,
      {
        inventoryRecordId: inventoryRecord.id,
        snapshotId,
      },
    );
  typia.assert(snapshot);
  // 7. Validate snapshot data consistency
  TestValidator.equals(
    "snapshot inventory_record_id matches inventory record",
    snapshot.inventory_record_id,
    inventoryRecord.id,
  );
  TestValidator.equals(
    "snapshot variant_id matches variant",
    snapshot.variant_id,
    variant.id,
  );
  TestValidator.equals(
    "snapshot quantity matches inventory record remaining_quantity",
    snapshot.quantity,
    inventoryRecord.remaining_quantity,
  );
  TestValidator.predicate(
    "snapshot has valid quantity type",
    typeof snapshot.quantity === "number",
  );
  TestValidator.predicate(
    "snapshot has valid reserved_quantity type",
    typeof snapshot.reserved_quantity === "number",
  );
  TestValidator.predicate(
    "snapshot has valid UUID format for id",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      snapshot.id,
    ),
  );
  TestValidator.predicate(
    "snapshot has valid date-time format for created_at",
    !isNaN(Date.parse(snapshot.created_at)),
  );
}
