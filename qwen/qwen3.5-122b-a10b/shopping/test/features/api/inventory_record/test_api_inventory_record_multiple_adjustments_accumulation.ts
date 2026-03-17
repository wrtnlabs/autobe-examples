import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_inventory_record } from "../../../prepare/prepare_random_ecommerce_mall_inventory_record";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { generate_random_ecommerce_mall_seller_variants_inventory_records_create } from "../../../generate/generate_random_ecommerce_mall_seller_variants_inventory_records_create";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
export async function test_api_inventory_record_multiple_adjustments_accumulation(connection: api.IConnection): Promise<void> {
    // 1. Register and authenticate seller
    const sellerConnection: api.IConnection = { host: connection.host };
    const sellerAuth = await authorize_seller_join(sellerConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: RandomGenerator.alphaNumeric(16),
            shop_name: RandomGenerator.name(),
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IEcommerceMallSeller.IJoin,
    });
    typia.assert(sellerAuth);
    // 2. Create product owned by the seller
    const product = await generate_random_ecommerce_mall_seller_products_create(sellerConnection, {
        body: {
            name: RandomGenerator.name(3),
            description: RandomGenerator.paragraph({ sentences: 5 }),
            category_id: typia.random<string & tags.Format<"uuid">>(),
            base_price: typia.random<number & tags.Type<"uint32"> & tags.Minimum<1000>>(),
        } satisfies IEcommerceMallProduct.ICreate,
    });
    typia.assert(product);
    // 3. Create product variant to add inventory records
    const variant = await generate_random_ecommerce_mall_seller_products_variants_create(sellerConnection, {
        params: {
            productId: product.id,
        },
        body: {
            skuCode: RandomGenerator.alphaNumeric(10),
            optionValues: [
                {
                    key: "color",
                    value: RandomGenerator.alphabets(5),
                },
            ] satisfies IEcommerceMallProductVariantOption[],
            stockQuantity: 0,
        } satisfies IEcommerceMallProductVariant.ICreate,
    });
    typia.assert(variant);
    // 4. First inventory record: restock (positive quantity_change)
    const restockAmount1 = typia.random<number & tags.Type<"int32"> & tags.Minimum<10> & tags.Maximum<100>>();
    const inventoryRecord1 = await generate_random_ecommerce_mall_seller_variants_inventory_records_create(sellerConnection, {
        params: {
            variantId: variant.id,
        },
        body: {
            quantityChange: restockAmount1,
            reason: "initial_restock",
        } satisfies IEcommerceMallInventoryRecord.ICreate,
    });
    typia.assert(inventoryRecord1);
    // Verify first record: current_stock should equal restockAmount1
    TestValidator.equals("first restock current_stock matches quantity_change", inventoryRecord1.currentStock, restockAmount1);
    // 5. Second inventory record: order deduction (negative quantity_change)
    let deductionAmount = typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>();
    deductionAmount = Math.min(deductionAmount, restockAmount1 - 1);
    const inventoryRecord2 = await generate_random_ecommerce_mall_seller_variants_inventory_records_create(sellerConnection, {
        params: {
            variantId: variant.id,
        },
        body: {
            quantityChange: -deductionAmount,
            reason: "order_placement",
        } satisfies IEcommerceMallInventoryRecord.ICreate,
    });
    typia.assert(inventoryRecord2);
    // Verify second record: current_stock should equal restockAmount1 - deductionAmount
    const expectedStockAfterDeduction = restockAmount1 - deductionAmount;
    TestValidator.equals("after deduction current_stock equals cumulative sum", inventoryRecord2.currentStock, expectedStockAfterDeduction);
    // 6. Third inventory record: another restock (positive quantity_change)
    const restockAmount2 = typia.random<number & tags.Type<"int32"> & tags.Minimum<5> & tags.Maximum<50>>();
    const inventoryRecord3 = await generate_random_ecommerce_mall_seller_variants_inventory_records_create(sellerConnection, {
        params: {
            variantId: variant.id,
        },
        body: {
            quantityChange: restockAmount2,
            reason: "supplier_delivery",
        } satisfies IEcommerceMallInventoryRecord.ICreate,
    });
    typia.assert(inventoryRecord3);
    // Verify third record: current_stock should equal restockAmount1 - deductionAmount + restockAmount2
    const expectedFinalStock = restockAmount1 - deductionAmount + restockAmount2;
    TestValidator.equals("after second restock current_stock equals full cumulative sum", inventoryRecord3.currentStock, expectedFinalStock);
    // 7. Verify chronological audit trail - all records have unique IDs
    TestValidator.notEquals("record 1 ID differs from record 2", inventoryRecord1.id, inventoryRecord2.id);
    TestValidator.notEquals("record 2 ID differs from record 3", inventoryRecord2.id, inventoryRecord3.id);
    TestValidator.notEquals("record 1 ID differs from record 3", inventoryRecord1.id, inventoryRecord3.id);
    // 8. Verify all records have unique reasons
    TestValidator.notEquals("record 1 reason differs from record 2", inventoryRecord1.reason, inventoryRecord2.reason);
    TestValidator.notEquals("record 2 reason differs from record 3", inventoryRecord2.reason, inventoryRecord3.reason);
    TestValidator.notEquals("record 1 reason differs from record 3", inventoryRecord1.reason, inventoryRecord3.reason);
    // 9. Verify recorded_at timestamps are in chronological order
    TestValidator.predicate("record 1 recorded before record 2", new Date(inventoryRecord1.recordedAt).getTime() <= new Date(inventoryRecord2.recordedAt).getTime());
    TestValidator.predicate("record 2 recorded before record 3", new Date(inventoryRecord2.recordedAt).getTime() <= new Date(inventoryRecord3.recordedAt).getTime());
}