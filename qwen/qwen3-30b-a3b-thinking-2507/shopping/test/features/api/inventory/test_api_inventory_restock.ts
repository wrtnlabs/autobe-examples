import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceInventory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceInventory";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import { prepare_random_ecommerce_category } from "../../../prepare/prepare_random_ecommerce_category";
import { prepare_random_ecommerce_product } from "../../../prepare/prepare_random_ecommerce_product";
import { prepare_random_ecommerce_inventory } from "../../../prepare/prepare_random_ecommerce_inventory";
import { prepare_random_ecommerce_product_variant } from "../../../prepare/prepare_random_ecommerce_product_variant";
import { generate_random_ecommerce_categories_create } from "../../../generate/generate_random_ecommerce_categories_create";
import { generate_random_ecommerce_products_create } from "../../../generate/generate_random_ecommerce_products_create";
import { generate_random_ecommerce_products_variants_create } from "../../../generate/generate_random_ecommerce_products_variants_create";
import { generate_random_ecommerce_products_variants_inventories_create } from "../../../generate/generate_random_ecommerce_products_variants_inventories_create";
export async function test_api_inventory_restock(connection: api.IConnection): Promise<void> {
    // Create category for product creation
    const category = await generate_random_ecommerce_categories_create(connection, {
        body: {
            name: "Electronics",
            description: "Electronics category for product testing with minimum 10+ characters",
        },
    });

    // Create base product for variant tracking
    const product = await generate_random_ecommerce_products_create(connection, {
        body: {
            name: "Smartphone",
            description: "Advanced smartphone with modern features and capabilities for daily use.",
            basePrice: 599.99,
            categoriesId: category.id,
        },
    });

    // Create product variant to enable inventory tracking
    const variant = await generate_random_ecommerce_products_variants_create(connection, {
        body: {
            sku: "SKU-" + RandomGenerator.alphaNumeric(8),
            stock_quantity: 10,
        },
        params: {
            productId: product.id,
        },
    });

    // Create inventory record with restock amount
    const inventory = await generate_random_ecommerce_products_variants_inventories_create(connection, {
        body: {
            quantity_change: 20,
            reason: "restock",
        },
        params: {
            productId: product.id,
            variantId: variant.id,
        },
    });

    // Verify inventory record
    TestValidator.equals("net quantity change matches input", inventory.quantity_change, 20);
    TestValidator.equals("reason matches expected value", inventory.reason, "restock");
    typia.assert(inventory);
}