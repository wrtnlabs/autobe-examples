import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
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
import { generate_random_ecommerce_mall_admin_categories_create } from "../../../generate/generate_random_ecommerce_mall_admin_categories_create";
import { generate_random_ecommerce_mall_seller_ecommerce_mall_variants_inventory_create } from "../../../generate/generate_random_ecommerce_mall_seller_ecommerce_mall_variants_inventory_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_inventory_record } from "../../../prepare/prepare_random_ecommerce_mall_inventory_record";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option_value } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option_value";

export async function test_api_inventory_adjustment_exceeds_stock(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection for category creation
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      actorType: "seller",
      requestedGrade: "admin",
      reason: "Need admin access for testing inventory management",
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  await authorize_admin_login(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  // 2. Create category
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // 3. Seller registration and authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    },
  });
  // Update connection with seller's authorized session
  const authenticatedSellerConnection: api.IConnection = {
    host: connection.host,
  };
  authenticatedSellerConnection.headers = {
    Authorization: sellerAuth.token.access,
  };
  // 4. Create product
  const product = await generate_random_ecommerce_mall_seller_products_create(
    authenticatedSellerConnection,
    {
      body: {
        categoryId: category.id,
      },
    },
  );
  typia.assert(product);
  // 5. Create product variant with initial stock of 0
  const variant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      authenticatedSellerConnection,
      {
        params: {
          productId: product.id,
        },
        body: {
          quantity: 0,
        },
      },
    );
  typia.assert(variant);
  // First operation - Limited restock (quantity: 10)
  const restockRecord =
    await api.functional.ecommerceMall.seller.ecommerceMall.variants.inventory.create(
      authenticatedSellerConnection,
      {
        variantId: variant.id,
        body: {
          quantity: 10 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
          operationType: "restock" as const,
          reason: "limited stock available",
        } satisfies IEcommerceMallInventoryRecord.ICreate,
      },
    );
  typia.assert(restockRecord);
  // Verify stock is now 10 by checking inventory record totals
  TestValidator.equals(
    "total stock quantity should be 10 after restock",
    restockRecord.totalStockQuantity,
    10,
  );
  // Get the inventory record count before the failed adjustment
  const lowStockCountBefore = restockRecord.lowStockCount;
  const inStockCountBefore = restockRecord.inStockCount;
  // Second operation - Adjustment exceeding stock (quantity: 15, but only 10 available)
  // This should be rejected with an error
  await TestValidator.error(
    "adjustment exceeding stock should be rejected",
    async () => {
      await api.functional.ecommerceMall.seller.ecommerceMall.variants.inventory.create(
        authenticatedSellerConnection,
        {
          variantId: variant.id,
          body: {
            quantity: 15 satisfies number &
              tags.Type<"int32"> &
              tags.Minimum<1>,
            operationType: "adjustment" as const,
            reason: "inventory count correction",
          } satisfies IEcommerceMallInventoryRecord.ICreate,
        },
      );
    },
  );
  // Perform a small successful restock to verify the original stock of 10 is preserved
  const verifyRecord =
    await api.functional.ecommerceMall.seller.ecommerceMall.variants.inventory.create(
      authenticatedSellerConnection,
      {
        variantId: variant.id,
        body: {
          quantity: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
          operationType: "restock" as const,
          reason: "verify original stock preserved",
        } satisfies IEcommerceMallInventoryRecord.ICreate,
      },
    );
  typia.assert(verifyRecord);
  // Stock should now be 11 (10 original + 1 new restock)
  // This confirms the failed adjustment did not change the stock from 10
  TestValidator.equals(
    "stock should be 11 after successful restock (10 original preserved)",
    verifyRecord.totalStockQuantity,
    11,
  );
  // Verify the low stock variants count is correct (variant with 11 units is not low stock)
  TestValidator.equals(
    "in stock count should remain consistent",
    verifyRecord.inStockCount,
    inStockCountBefore + 1,
  );
}
