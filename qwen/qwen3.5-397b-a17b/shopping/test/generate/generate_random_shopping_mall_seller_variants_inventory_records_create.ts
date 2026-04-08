import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_shopping_mall_inventory_record } from "../prepare/prepare_random_shopping_mall_inventory_record";

/**
 * Generate a random shopping mall inventory record via the API for E2E testing.
 *
 * Creates an inventory record to restock a product variant by calling the seller inventory records endpoint. The function uses the prepare function to generate valid test data with randomized quantity_delta (1-100 units) and reason codes (RESTOCK, ADJUSTMENT, DAMAGED, LOST, ORDER_CANCELLATION, ORDER_REFUND).
 *
 * This generation function is designed for seller-authorized test scenarios where a seller needs to add inventory to their product variants. The variantId parameter identifies which product variant to restock, and the backend validates that the requesting seller owns the variant before creating the record.
 *
 * Inventory records are immutable audit trail entries that track stock movements. Each record includes a generated UUID, the quantity change, reason code, and creation timestamp. The current stock quantity for a variant is calculated by summing all quantity_delta values from its inventory records.
 *
 * @param connection - API connection configuration for the test environment
 * @param props - Generation options including optional body overrides and required variantId
 * @param props.body - Optional partial overrides for the inventory record creation data
 * @param props.params - URL path parameters including the variantId to restock
 * @returns The created inventory record with all generated fields
 */
export async function generate_random_shopping_mall_seller_variants_inventory_records_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallInventoryRecord.ICreate>;
    params: {
      variantId: string;
    };
  },
): Promise<IShoppingMallInventoryRecord> {
  const prepared: IShoppingMallInventoryRecord.ICreate =
    prepare_random_shopping_mall_inventory_record(props.body);
  const result: IShoppingMallInventoryRecord =
    await api.functional.shoppingMall.seller.variants.inventory_records.create(
      connection,
      {
        variantId: props.params.variantId,
        body: prepared,
      },
    );
  return result;
}
