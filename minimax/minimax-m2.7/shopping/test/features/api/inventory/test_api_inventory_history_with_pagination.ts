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

export async function test_api_inventory_history_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin registration and login
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  await authorize_admin_login(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  // 2. Admin creates a category
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // 3. Seller registration and login
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  // 4. Seller login
  await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerAuth.email,
      password: sellerPassword,
    } satisfies IEcommerceMallSeller.ILogin,
  });
  // 5. Seller creates a product
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        categoryId: category.id,
        basePrice: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >() satisfies number as number,
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 6. Seller creates a product variant
  const variant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: `SKU-${RandomGenerator.alphaNumeric(8)}`,
          optionValues: [
            {
              key: "size",
              value: "large",
            } satisfies IEcommerceMallProductVariantOptionValue.ICreate,
          ],
          quantity: 0,
        } satisfies IEcommerceMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // 7. Add multiple inventory records to create history
  const recordCount = 5;
  for (let i = 0; i < recordCount; i++) {
    const record =
      await generate_random_ecommerce_mall_seller_products_variants_inventory_create(
        sellerConnection,
        {
          params: { productId: product.id, variantId: variant.id },
          body: {
            quantity: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<1>
            >() satisfies number as number,
            operationType: "restock" as const,
            reason: `Stock replenishment ${i + 1}`,
          } satisfies IEcommerceMallInventoryRecord.ICreate,
        },
      );
    typia.assert(record);
  }
  // 8. Query inventory history with pagination
  const pageLimit = 2;
  const page1 =
    await api.functional.ecommerceMall.seller.products.variants.inventory.index(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          page: 1,
          limit: pageLimit,
        } satisfies IEcommerceMallInventoryRecord.IRequest,
      },
    );
  typia.assert(page1);
  // 9. Validate pagination structure - note: page1.pagination is IPageIEcommerceMall.IPagination
  // which contains { pagination: IPage.IPagination, data: ... }
  // So we access page1.pagination.pagination for actual pagination values
  TestValidator.equals(
    "pagination metadata exists",
    page1.pagination.pagination !== null,
    true,
  );
  TestValidator.equals(
    "current page is 1",
    page1.pagination.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit matches request",
    page1.pagination.pagination.limit,
    pageLimit,
  );
  TestValidator.equals(
    "records count matches created records",
    page1.pagination.pagination.records,
    recordCount,
  );
  TestValidator.equals(
    "pages calculated correctly",
    page1.pagination.pagination.pages,
    Math.ceil(recordCount / pageLimit),
  );
  // 10. Validate data array has records
  TestValidator.equals("data array not empty", page1.data.length > 0, true);
  TestValidator.equals(
    "data length equals limit on first page",
    page1.data.length,
    pageLimit,
  );
  // 11. Validate each record has required fields
  for (const record of page1.data) {
    TestValidator.equals("record has id", record.id !== null, true);
    TestValidator.equals(
      "record has quantityChange",
      record.quantityChange !== null,
      true,
    );
    TestValidator.equals("record has reason", record.reason !== null, true);
    TestValidator.equals(
      "record has createdAt",
      record.createdAt !== null,
      true,
    );
  }
  // 12. Query second page
  const page2 =
    await api.functional.ecommerceMall.seller.products.variants.inventory.index(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          page: 2,
          limit: pageLimit,
        } satisfies IEcommerceMallInventoryRecord.IRequest,
      },
    );
  typia.assert(page2);
  TestValidator.equals(
    "second page current is 2",
    page2.pagination.pagination.current,
    2,
  );
  TestValidator.equals(
    "second page has remaining records",
    page2.data.length,
    recordCount - pageLimit,
  );
  // 13. Query all records (limit > total)
  const allRecordsPage =
    await api.functional.ecommerceMall.seller.products.variants.inventory.index(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          page: 1,
          limit: 100,
        } satisfies IEcommerceMallInventoryRecord.IRequest,
      },
    );
  typia.assert(allRecordsPage);
  TestValidator.equals(
    "all records returned",
    allRecordsPage.data.length,
    recordCount,
  );
  TestValidator.equals(
    "only one page when limit > records",
    allRecordsPage.pagination.pagination.pages,
    1,
  );
}
