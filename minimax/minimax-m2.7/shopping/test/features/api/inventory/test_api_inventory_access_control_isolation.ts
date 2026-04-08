import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMall";
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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMall";
import type { IPageIEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallInventoryRecord";
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
import { generate_random_ecommerce_mall_seller_products_variants_inventory_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_inventory_create";
import { prepare_random_ecommerce_mall_inventory_record } from "../../../prepare/prepare_random_ecommerce_mall_inventory_record";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option_value } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option_value";

export async function test_api_inventory_access_control_isolation(
  connection: api.IConnection,
): Promise<void> {
  // Create first seller (Seller A) who will own the inventory records
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerA = await authorize_seller_join(sellerAConnection, {});
  typia.assert(sellerA);
  // Create product and variant for Seller A
  const productA = await generate_random_ecommerce_mall_seller_products_create(
    sellerAConnection,
    {},
  );
  typia.assert(productA);
  const variantA =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerAConnection,
      {
        params: { productId: productA.id },
      },
    );
  typia.assert(variantA);
  // Add inventory record for Seller A's variant
  const inventoryA =
    await generate_random_ecommerce_mall_seller_products_variants_inventory_create(
      sellerAConnection,
      {
        params: { productId: productA.id, variantId: variantA.id },
      },
    );
  typia.assert(inventoryA);
  // Create second seller (Seller B) who should NOT see Seller A's inventory
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerB = await authorize_seller_join(sellerBConnection, {});
  typia.assert(sellerB);
  // Seller B queries for inventory - should have no records or empty data
  const sellerBInventory =
    await api.functional.ecommerceMall.seller.inventories.index(
      sellerBConnection,
      {
        body: {} satisfies IEcommerceMallInventoryRecord.IRequest,
      },
    );
  typia.assert(sellerBInventory);
  // Seller B should have empty or zero inventory since they haven't created anything
  TestValidator.predicate(
    "Seller B should have no inventory records initially",
    sellerBInventory.data.length === 0 ||
      sellerBInventory.data.every((record) => record.totalVariantsCount === 0),
  );
  // Seller B queries for inventory filtered by Seller A's variant ID - should get empty
  const filteredInventory =
    await api.functional.ecommerceMall.seller.inventories.index(
      sellerBConnection,
      {
        body: {
          variantId: variantA.id,
        } satisfies IEcommerceMallInventoryRecord.IRequest,
      },
    );
  typia.assert(filteredInventory);
  // Verify Seller B cannot see Seller A's inventory by variant ID
  TestValidator.equals(
    "Seller B should not see Seller A's variant inventory",
    filteredInventory.data.length,
    0,
  );
  // Create own product and variant for Seller B to verify access control works both ways
  const productB = await generate_random_ecommerce_mall_seller_products_create(
    sellerBConnection,
    {},
  );
  typia.assert(productB);
  const variantB =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerBConnection,
      {
        params: { productId: productB.id },
      },
    );
  typia.assert(variantB);
  const inventoryB =
    await generate_random_ecommerce_mall_seller_products_variants_inventory_create(
      sellerBConnection,
      {
        params: { productId: productB.id, variantId: variantB.id },
      },
    );
  typia.assert(inventoryB);
  // Verify Seller B can see their own inventory
  const sellerBInventoryWithOwn =
    await api.functional.ecommerceMall.seller.inventories.index(
      sellerBConnection,
      {
        body: {
          variantId: variantB.id,
        } satisfies IEcommerceMallInventoryRecord.IRequest,
      },
    );
  typia.assert(sellerBInventoryWithOwn);
  // Seller B should see their own inventory record
  TestValidator.predicate(
    "Seller B should see their own inventory record",
    sellerBInventoryWithOwn.data.length > 0,
  );
  // Verify Seller A cannot see Seller B's inventory either (bidirectional check)
  const sellerAInventoryCheck =
    await api.functional.ecommerceMall.seller.inventories.index(
      sellerAConnection,
      {
        body: {
          variantId: variantB.id,
        } satisfies IEcommerceMallInventoryRecord.IRequest,
      },
    );
  typia.assert(sellerAInventoryCheck);
  TestValidator.equals(
    "Seller A should not see Seller B's variant inventory",
    sellerAInventoryCheck.data.length,
    0,
  );
}
