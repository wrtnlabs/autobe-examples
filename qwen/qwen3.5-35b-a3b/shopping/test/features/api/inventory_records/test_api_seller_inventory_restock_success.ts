import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
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
import { generate_random_ecommerce_mall_seller_inventory_records_create } from "../../../generate/generate_random_ecommerce_mall_seller_inventory_records_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { prepare_random_ecommerce_mall_inventory_record } from "../../../prepare/prepare_random_ecommerce_mall_inventory_record";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";

export async function test_api_seller_inventory_restock_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Seller joins and authenticates
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(seller);
  // Create new connection with token for subsequent operations
  const sellerAuthConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: seller.token.access },
  };
  // 2. Create a product to sell
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerAuthConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 3. Create a product variant with initial stock
  const initialStock = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<100>
  >();
  const variant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerAuthConnection,
      {
        body: {
          sku: RandomGenerator.alphaNumeric(12),
          options: { size: "Large", color: "Red" },
          base_price: product.base_price + 500,
          stock_quantity: initialStock,
          status: "active",
          is_default: true,
        } satisfies IEcommerceMallProductVariant.ICreate,
        params: { productId: product.id },
      },
    );
  typia.assert(variant);
  // Validate initial stock quantity
  TestValidator.equals(
    "initial stock matches",
    variant.stockQuantity,
    initialStock,
  );
  // 4. Create inventory record to restock (positive quantity)
  const restockQuantity = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<50>
  >();
  const inventoryRecord =
    await generate_random_ecommerce_mall_seller_inventory_records_create(
      sellerAuthConnection,
      {
        body: {
          ecommerce_mall_product_variant_id: variant.id,
          quantity_change: restockQuantity,
          reason: "Supplier delivery restock",
          type: "INCOMING",
          description: "Monthly restock from supplier",
        } satisfies IEcommerceMallInventoryRecord.ICreate,
      },
    );
  typia.assert(inventoryRecord);
  // 5. Validate inventory record creation
  TestValidator.equals(
    "inventory record type is INCOMING",
    inventoryRecord.type,
    "INCOMING",
  );
  TestValidator.equals(
    "quantity_change matches restock",
    inventoryRecord.quantity_change,
    restockQuantity,
  );
  // Calculate expected remaining quantity (previous stock + new quantity)
  const expectedRemainingQuantity = initialStock + restockQuantity;
  TestValidator.equals(
    "remaining_quantity calculation correct",
    inventoryRecord.remaining_quantity,
    expectedRemainingQuantity,
  );
  // Validate inventory record variant reference
  TestValidator.equals(
    "inventory record variant_id matches",
    inventoryRecord.variant_id,
    variant.id,
  );
  TestValidator.equals(
    "inventory record variant SKU matches",
    inventoryRecord.variant.sku,
    variant.sku,
  );
  // 6. Validate audit trail immutability
  TestValidator.predicate(
    "inventory record has created_at",
    () => inventoryRecord.created_at !== undefined,
  );
  TestValidator.predicate(
    "inventory record has updated_at",
    () => inventoryRecord.updated_at !== undefined,
  );
  TestValidator.equals(
    "inventory record deleted_at is null (immutable)",
    inventoryRecord.deleted_at,
    null,
  );
  // 7. Business rule: variant belongs to product owned by seller
  const productDetail = typia.assert<IEcommerceMallProduct>(inventoryRecord.variant.product);
  TestValidator.equals(
    "inventory variant belongs to seller's product",
    productDetail.seller.id,
    seller.id,
  );
}