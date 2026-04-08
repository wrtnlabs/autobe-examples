import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMall";
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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMall";
import type { IPageIEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallInventoryRecord";
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
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { generate_random_ecommerce_mall_seller_products_variants_inventory_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_inventory_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_inventory_record } from "../../../prepare/prepare_random_ecommerce_mall_inventory_record";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option_value } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option_value";

export async function test_api_inventory_records_admin_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin account via join
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const adminJoinResult = await authorize_admin_join(adminJoinConnection, {
    body: {
      actorType: "seller",
      requestedGrade: "admin",
      reason:
        "Need admin access to manage inventory records across the platform for testing purposes.",
    },
  });
  // Get admin credentials from join result and login
  const adminLoginConnection: api.IConnection = { host: connection.host };
  const adminLoginResult = await authorize_admin_login(adminLoginConnection, {
    body: {
      email: adminJoinResult.email,
      password: "AdminPassword123!", // Default password or use from test setup
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // Step 2: Create seller account
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  await api.functional.ecommerceMall.auth.seller.join(sellerJoinConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  // Login as seller
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerLoginConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
    },
  });
  // Step 3: Create product category (admin creates category)
  const category = await api.functional.ecommerceMall.admin.categories.create(
    adminLoginConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IEcommerceMallCategory.ICreate,
    },
  );
  typia.assert(category);
  // Step 4: Create product
  const product = await api.functional.ecommerceMall.seller.products.create(
    sellerLoginConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        categoryId: category.id,
        basePrice: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // Step 5: Create product variant
  const variant =
    await api.functional.ecommerceMall.seller.products.variants.create(
      sellerLoginConnection,
      {
        productId: product.id,
        body: {
          skuCode: `SKU-${RandomGenerator.alphaNumeric(10)}`,
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
          optionValues: [
            {
              key: "color",
              value: RandomGenerator.pick(["red", "blue", "green"] as const),
            },
            {
              key: "size",
              value: RandomGenerator.pick(["S", "M", "L", "XL"] as const),
            },
          ],
        } satisfies IEcommerceMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // Step 6: Add inventory records
  const inventoryRecord1 =
    await api.functional.ecommerceMall.seller.products.variants.inventory.create(
      sellerLoginConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
          operationType: "restock",
          reason: "initial_restock",
        } satisfies IEcommerceMallInventoryRecord.ICreate,
      },
    );
  typia.assert(inventoryRecord1);
  const inventoryRecord2 =
    await api.functional.ecommerceMall.seller.products.variants.inventory.create(
      sellerLoginConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
          operationType: "restock",
          reason: "warehouse_transfer",
        } satisfies IEcommerceMallInventoryRecord.ICreate,
      },
    );
  typia.assert(inventoryRecord2);
  // Step 7: Retrieve inventory records as admin
  const inventoryRecordsPage =
    await api.functional.ecommerceMall.admin.productVariants.inventoryRecords.index(
      adminLoginConnection,
      {
        variantId: variant.id,
        body: {
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallInventoryRecord.IRequest,
      },
    );
  typia.assert(inventoryRecordsPage);
  // Validate inventory records data - check data exists and has at least 2 records
  TestValidator.predicate(
    "should have at least 2 inventory records",
    inventoryRecordsPage.data.length >= 2,
  );
  // Verify each record has required fields (reason and createdAt exist on the type)
  for (const record of inventoryRecordsPage.data) {
    TestValidator.predicate(
      "record should have reason",
      record.reason !== undefined && record.reason !== null,
    );
    TestValidator.predicate(
      "record should have createdAt",
      record.createdAt !== undefined && record.createdAt !== null,
    );
  }
}