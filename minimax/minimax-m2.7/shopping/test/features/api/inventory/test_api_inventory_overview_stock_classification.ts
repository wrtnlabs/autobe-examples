import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminRequestOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequestOfCustomer";
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
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
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
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_ecommerce_mall_seller_product_variants_inventory_records_create } from "../../../generate/generate_random_ecommerce_mall_seller_product_variants_inventory_records_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { prepare_random_ecommerce_mall_inventory_record } from "../../../prepare/prepare_random_ecommerce_mall_inventory_record";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option_value } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option_value";

export async function test_api_inventory_overview_stock_classification(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super admin account
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {});
  // 2. Create seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!" as string & tags.Format<"password">,
      href: "https://test.com/register",
      referrer: "https://google.com",
    },
  });
  // 3. Create product with category
  const product = await api.functional.ecommerceMall.seller.products.create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 1 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        categoryId: typia.random<string & tags.Format<"uuid">>(),
        basePrice: 10000,
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  // 4. Create Variant A with 0 units (out_of_stock) - no inventory record needed
  const variantA =
    await api.functional.ecommerceMall.seller.products.variants.create(
      sellerConnection,
      {
        productId: product.id,
        body: {
          skuCode: `SKU-OUT-OF-STOCK-${RandomGenerator.alphaNumeric(6)}`,
          optionValues: [{ key: "Size", value: "OutOfStock" }],
          quantity: 0,
        } satisfies IEcommerceMallProductVariant.ICreate,
      },
    );
  // 5. Create Variant B with 5 units (low_stock)
  const variantB =
    await api.functional.ecommerceMall.seller.products.variants.create(
      sellerConnection,
      {
        productId: product.id,
        body: {
          skuCode: `SKU-LOW-STOCK-${RandomGenerator.alphaNumeric(6)}`,
          optionValues: [{ key: "Size", value: "LowStock" }],
          quantity: 0,
        } satisfies IEcommerceMallProductVariant.ICreate,
      },
    );
  // 6. Create Variant C with 15 units (in_stock)
  const variantC =
    await api.functional.ecommerceMall.seller.products.variants.create(
      sellerConnection,
      {
        productId: product.id,
        body: {
          skuCode: `SKU-IN-STOCK-${RandomGenerator.alphaNumeric(6)}`,
          optionValues: [{ key: "Size", value: "InStock" }],
          quantity: 0,
        } satisfies IEcommerceMallProductVariant.ICreate,
      },
    );
  // 7. Add inventory for Variant B (5 units - low stock)
  await api.functional.ecommerceMall.seller.productVariants.inventoryRecords.create(
    sellerConnection,
    {
      variantId: variantB.id,
      body: {
        quantity: 5 as number & tags.Type<"int32"> & tags.Minimum<1>,
        operationType: "restock",
        reason: "Restock from supplier",
      } satisfies IEcommerceMallInventoryRecord.ICreate,
    },
  );
  // 8. Add inventory for Variant C (15 units - in stock)
  await api.functional.ecommerceMall.seller.productVariants.inventoryRecords.create(
    sellerConnection,
    {
      variantId: variantC.id,
      body: {
        quantity: 15 as number & tags.Type<"int32"> & tags.Minimum<1>,
        operationType: "restock",
        reason: "Large restock",
      } satisfies IEcommerceMallInventoryRecord.ICreate,
    },
  );
  // 9. Submit admin request (as seller)
  const adminRequest =
    await api.functional.ecommerceMall.auth.admin.request.join(
      sellerConnection,
      {
        body: {
          actorType: "seller",
          requestedGrade: "admin",
          reason: RandomGenerator.paragraph({ sentences: 3 }),
          href: "https://test.com/admin-request",
          referrer: "https://test.com",
        } satisfies IEcommerceMallAdmin.IJoin,
      },
    );
  // 10. SuperAdmin approves the admin request
  await api.functional.ecommerceMall.superAdmin.admin.requests.approve(
    superAdminConnection,
    {
      requestId: adminRequest.id,
    },
  );
  // 11. Login as admin to get admin credentials
  const adminLoginConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminLoginConnection, {
    body: {
      email: seller.email,
      password: "TestPassword123!" as string & tags.Format<"password">,
      href: "https://test.com/admin/login",
      referrer: "https://test.com",
    },
  });
  // 12. Call the inventory overview endpoint
  const inventoryOverview =
    await api.functional.ecommerceMall.admin.inventory.overview.at(
      adminLoginConnection,
    );
  // 13. Validate the response
  typia.assert(inventoryOverview);
  // 14. Validate stock classification counts
  TestValidator.equals(
    "outOfStockCount should be 1",
    inventoryOverview.outOfStockCount,
    1,
  );
  TestValidator.equals(
    "lowStockCount should be 1",
    inventoryOverview.lowStockCount,
    1,
  );
  TestValidator.equals(
    "inStockCount should be 1",
    inventoryOverview.inStockCount,
    1,
  );
  TestValidator.equals(
    "totalStockQuantity should be 20",
    inventoryOverview.totalStockQuantity,
    20,
  );
  TestValidator.equals(
    "totalVariantsCount should be 3",
    inventoryOverview.totalVariantsCount,
    3,
  );
  // 15. Validate lowStockVariants contains only the variant with 5 units
  TestValidator.equals(
    "lowStockVariants length should be 1",
    inventoryOverview.lowStockVariants.length,
    1,
  );
  if (inventoryOverview.lowStockVariants.length > 0) {
    const lowStockVariant = inventoryOverview.lowStockVariants[0];
    TestValidator.equals(
      "lowStockVariant skuCode matches",
      lowStockVariant.skuCode,
      variantB.skuCode,
    );
    TestValidator.equals(
      "lowStockVariant quantity should be 5",
      lowStockVariant.quantity,
      5,
    );
  }
}
