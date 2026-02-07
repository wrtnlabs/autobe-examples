import * as api from "@ORGANIZATION/PROJECT-api";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceInventory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceInventory";
import type { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import { prepare_random_ecommerce_category } from "../../../prepare/prepare_random_ecommerce_category";
import { generate_random_ecommerce_categories_create } from "../../../generate/generate_random_ecommerce_categories_create";
export async function test_api_inventory_order_fulfillment(connection: api.IConnection): Promise<void> {
    const adminConnection: api.IConnection = { host: connection.host };
    const createdCategory = await generate_random_ecommerce_categories_create(adminConnection, {
        body: {
            name: RandomGenerator.name(1),
            description: RandomGenerator.paragraph({ sentences: 1 }),
        },
    });
    const productId = 'product-' + RandomGenerator.alphaNumeric(8);
    const variantId = 'variant-' + RandomGenerator.alphaNumeric(8);
    const updatedInventory = await api.functional.ecommerce.products.variants.inventories.updateInventory(adminConnection, {
        productId,
        variantId,
        body: {
            quantity_change: -5,
            reason: 'customer_order',
        },
    });
    typia.assert(updatedInventory);
    TestValidator.equals('Order fulfillment should decrease stock by 5', updatedInventory.quantity_change, -5);
    TestValidator.equals('Reason should be customer_order', updatedInventory.reason, 'customer_order');
    TestValidator.equals('Stock quantity should be 15 after fulfill order', updatedInventory.variant.stock_quantity, 15);
    TestValidator.predicate('created_at should be valid ISO date-time', /^d{4}-d{2}-d{2}Td{2}:d{2}:d{2}\.\d{3}Z$/.test(updatedInventory.created_at));
    TestValidator.predicate('updated_at should be valid ISO date-time', /^d{4}-d{2}-d{2}Td{2}:d{2}:d{2}\.\d{3}Z$/.test(updatedInventory.updated_at));
}