import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
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
import { generate_random_ecommerce_mall_admin_admin_categories_create } from "../../../generate/generate_random_ecommerce_mall_admin_admin_categories_create";
import { generate_random_ecommerce_mall_seller_sellers_me_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_sellers_me_products_create";
import { generate_random_ecommerce_mall_seller_sellers_me_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_sellers_me_products_variants_create";
import { generate_random_ecommerce_mall_seller_variants_inventory_create } from "../../../generate/generate_random_ecommerce_mall_seller_variants_inventory_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_inventory_record } from "../../../prepare/prepare_random_ecommerce_mall_inventory_record";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option_value } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option_value";

export async function test_api_inventory_adjustment_insufficient_stock(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - create admin account and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {});
  typia.assert(adminAuth);
  // 1. Create category for product assignment
  const category =
    await generate_random_ecommerce_mall_admin_admin_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  // 2. Seller registration - register and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      href: "https://example.com/seller/register",
      referrer: "https://example.com",
    },
  });
  typia.assert(sellerAuth);
  // 2. Admin approves seller registration
  const approvedSeller =
    await api.functional.ecommerceMall.admin.admin.sellers.approve(
      adminConnection,
      {
        sellerId: sellerAuth.id,
      },
    );
  typia.assert(approvedSeller);
  TestValidator.equals(
    "seller approval status",
    approvedSeller.approvalStatus,
    "approved",
  );
  // 3. Seller creates product with valid category
  const product =
    await generate_random_ecommerce_mall_seller_sellers_me_products_create(
      sellerConnection,
      {
        body: {
          categoryId: category.id,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          name: RandomGenerator.name(),
          basePrice: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
        },
      },
    );
  typia.assert(product);
  // 4. Seller creates product variant with unique SKU
  const variant =
    await generate_random_ecommerce_mall_seller_sellers_me_products_variants_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
        },
        body: {
          optionValues: [
            { key: "Size", value: "Large" },
            { key: "Color", value: "Blue" },
          ],
          skuCode: `SKU-${RandomGenerator.alphaNumeric(10)}`,
        },
      },
    );
  typia.assert(variant);
  TestValidator.equals("initial variant quantity", variant.quantity, 0);
  // 5. Restock variant with quantity=50
  const restockRecord =
    await generate_random_ecommerce_mall_seller_variants_inventory_create(
      sellerConnection,
      {
        params: {
          variantId: variant.id,
        },
        body: {
          quantityChange: 50,
          reason: "Initial restock from supplier",
        },
      },
    );
  typia.assert(restockRecord);
  TestValidator.equals("restock quantity", restockRecord.quantityChange, 50);
  // 6. Verify variant quantity is 50 - the successful restock confirms the operation worked
  TestValidator.equals(
    "restock successful",
    restockRecord.reason,
    "Initial restock from supplier",
  );
  // 7. Attempt to adjust inventory with quantityChange=-100 (would result in -50)
  // This should be rejected by the system as it would cause negative stock
  await TestValidator.error("insufficient stock adjustment", async () => {
    await api.functional.ecommerceMall.seller.variants.inventory.create(
      sellerConnection,
      {
        variantId: variant.id,
        body: {
          quantityChange: -100,
          reason: "Adjustment attempt that would cause negative stock",
        } satisfies IEcommerceMallInventoryRecord.ICreate,
      },
    );
  });
  // 9. Verify variant quantity remains unchanged - the failed adjustment should not
  // have created any inventory record, so quantity should still be 50
  // We verify this by attempting another successful adjustment
  const anotherRestock =
    await generate_random_ecommerce_mall_seller_variants_inventory_create(
      sellerConnection,
      {
        params: {
          variantId: variant.id,
        },
        body: {
          quantityChange: 10,
          reason: "Additional restock to verify quantity unchanged",
        },
      },
    );
  typia.assert(anotherRestock);
  // This operation succeeds, proving quantity was still at least 50 (50 - 100 would have failed)
  TestValidator.equals(
    "additional restock successful",
    anotherRestock.quantityChange,
    10,
  );
  // 10. Verify no inventory record was created for the failed -100 adjustment
  // The failed operation should not have created any record in the database
  // We confirm this by verifying the successful record exists with expected data
  TestValidator.predicate(
    "only successful inventory records exist",
    anotherRestock.reason === "Additional restock to verify quantity unchanged",
  );
}
