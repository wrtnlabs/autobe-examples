import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformAdmin";
import type { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
import type { IEcommercePlatformInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformInventoryRecord";
import type { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
import type { IEcommercePlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductImage";
import type { IEcommercePlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariant";
import type { IEcommercePlatformProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariantOption";
import type { IEcommercePlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSeller";
import type { IEcommercePlatformSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerApprovalRequest";
import type { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { generate_random_ecommerce_platform_admin_categories_create } from "../../../generate/generate_random_ecommerce_platform_admin_categories_create";
import { generate_random_ecommerce_platform_seller_products_create } from "../../../generate/generate_random_ecommerce_platform_seller_products_create";
import { generate_random_ecommerce_platform_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_platform_seller_products_variants_create";
import { generate_random_ecommerce_platform_seller_products_variants_inventory_create } from "../../../generate/generate_random_ecommerce_platform_seller_products_variants_inventory_create";
import { prepare_random_ecommerce_platform_category } from "../../../prepare/prepare_random_ecommerce_platform_category";
import { prepare_random_ecommerce_platform_inventory_record } from "../../../prepare/prepare_random_ecommerce_platform_inventory_record";
import { prepare_random_ecommerce_platform_product } from "../../../prepare/prepare_random_ecommerce_platform_product";
import { prepare_random_ecommerce_platform_product_variant } from "../../../prepare/prepare_random_ecommerce_platform_product_variant";
import { prepare_random_ecommerce_platform_product_variant_option } from "../../../prepare/prepare_random_ecommerce_platform_product_variant_option";

/**
 * Test seller inventory restocking for a product variant.
 *
 * Validates the inventory management flow where a seller adds positive stock to their product variant to replenish inventory after sales or initial stocking. The system creates an immutable inventory ledger entry with a positive quantity_delta and a descriptive reason. This action increases the computed current stock for the variant, which is derived by summing all inventory record quantity_delta values.
 *
 * 1. Administrator joins the platform and authenticates.
 * 2. Administrator creates a product category.
 * 3. Seller joins the platform.
 * 4. Seller logs in.
 * 5. Seller creates a product in the category.
 * 6. Seller creates a product variant with SKU code and options.
 * 7. Seller creates an inventory record with positive quantity_delta to restock the variant.
 * 8. Validates the inventory record has correct quantity_delta and reason.
 * 9. Validates the variant stock_quantity reflects the inventory restocking.
 */
export async function test_api_seller_inventory_restock_product_variant(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator joins and authenticates
  const adminConnection: api.IConnection = { host: connection.host };
  await api.functional.ecommercePlatform.auth.admin.join(adminConnection, {
    body: {
      password: "AdminPassword123!",
      email: typia.random<string & tags.Format<"email">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommercePlatformAdmin.IJoin,
  });
  // 2. Administrator creates a product category
  const category =
    await api.functional.ecommercePlatform.admin.categories.create(
      adminConnection,
      {
        body: {
          description: "Test category for inventory restocking tests",
          name: "Electronics",
        } satisfies IEcommercePlatformCategory.ICreate,
      },
    );
  typia.assert(category);
  // 3. Seller joins the platform
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized =
    await api.functional.ecommercePlatform.auth.seller.join(sellerConnection, {
      body: {
        password: "SellerPassword123!",
        email: typia.random<string & tags.Format<"email">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommercePlatformSeller.IJoin,
    });
  typia.assert(sellerAuthorized);
  // 4. Seller logs in
  await api.functional.ecommercePlatform.auth.seller.login(sellerConnection, {
    body: {
      password: "SellerPassword123!",
      email: sellerAuthorized.email,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommercePlatformSeller.ILogin,
  });
  // 5. Seller creates a product in the category
  const product = await api.functional.ecommercePlatform.seller.products.create(
    sellerConnection,
    {
      body: {
        description:
          "Test wireless headphones for inventory restocking validation",
        name: "Wireless Headphones",
        base_price: 99.99,
        category_id: category.id,
      } satisfies IEcommercePlatformProduct.ICreate,
    },
  );
  typia.assert(product);
  // 6. Seller creates a product variant with SKU code and options
  const variant =
    await api.functional.ecommercePlatform.seller.products.variants.create(
      sellerConnection,
      {
        productId: product.id,
        body: {
          options: [
            {
              attributeKey: "color",
              attributeValue: "black",
            },
            {
              attributeKey: "size",
              attributeValue: "standard",
            },
          ],
          skuCode: "WH-BLK-STD-001",
        } satisfies IEcommercePlatformProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // 7. Seller creates an inventory record with positive quantity_delta to restock the variant
  const restockQuantity = 100;
  const inventoryRecord =
    await api.functional.ecommercePlatform.seller.products.variants.inventory.create(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          reason: "Initial inventory restocking for new product variant",
          quantity_delta: restockQuantity,
        } satisfies IEcommercePlatformInventoryRecord.ICreate,
      },
    );
  typia.assert(inventoryRecord);
  // 8. Validates the inventory record has correct quantity_delta and reason
  TestValidator.equals(
    "inventory record quantity_delta matches input",
    inventoryRecord.quantity_delta,
    restockQuantity,
  );
  TestValidator.predicate(
    "inventory record quantity_delta is positive for restocking",
    inventoryRecord.quantity_delta > 0,
  );
  TestValidator.predicate(
    "inventory record has descriptive reason",
    inventoryRecord.reason.length > 0,
  );
  // 9. Validates the variant stock_quantity reflects the inventory restocking
  TestValidator.equals(
    "variant stock_quantity equals inventory quantity_delta",
    variant.stock_quantity,
    restockQuantity,
  );
}
