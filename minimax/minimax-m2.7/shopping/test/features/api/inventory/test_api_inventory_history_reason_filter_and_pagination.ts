import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
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
import { generate_random_ecommerce_mall_seller_products_variants_inventory_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_inventory_create";
import { generate_random_ecommerce_mall_seller_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_seller_products_variants_create";
import { prepare_random_ecommerce_mall_inventory_record } from "../../../prepare/prepare_random_ecommerce_mall_inventory_record";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option_value } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option_value";

export async function test_api_inventory_history_reason_filter_and_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuth);
  // 2. Retrieve categories to get a valid categoryId
  const categories =
    await api.functional.ecommerceMall.categories.browse(connection);
  typia.assert(categories);
  const categoryId = categories.subcategories[0]?.id ?? categories.id;
  // 3. Create a product with the category
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        category_id: categoryId,
      },
    },
  );
  typia.assert(product);
  // 4. Create multiple variants for the product
  const variant1 =
    await generate_random_ecommerce_mall_seller_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: `SKU-${RandomGenerator.alphaNumeric(8)}`,
          option_values: [
            {
              key: "size",
              value: "Large",
            } satisfies IEcommerceMallProductVariantOptionValue.ICreate,
          ],
        },
      },
    );
  typia.assert(variant1);
  const variant2 =
    await generate_random_ecommerce_mall_seller_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: `SKU-${RandomGenerator.alphaNumeric(8)}`,
          option_values: [
            {
              key: "size",
              value: "Small",
            } satisfies IEcommerceMallProductVariantOptionValue.ICreate,
          ],
        },
      },
    );
  typia.assert(variant2);
  // 5. Add multiple inventory records with different reasons
  const reasons = ["restock", "adjustment", "order_placement"] as const;
  for (const reason of reasons) {
    const variant = reason === "adjustment" ? variant2 : variant1;
    await generate_random_ecommerce_mall_seller_products_variants_inventory_create(
      sellerConnection,
      {
        params: { productId: product.id, variantId: variant.id },
        body: {
          operation: reason === "adjustment" ? "adjust" : "restock",
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
          reason: reason,
        },
      },
    );
  }
  // 6. Query inventory history with reason filter (partial match)
  const filteredResponse =
    await api.functional.ecommerceMall.seller.inventory_history.index(
      sellerConnection,
      {
        body: {
          reason: "restock",
        } satisfies IEcommerceMallInventoryRecord.IRequest,
      },
    );
  typia.assert(filteredResponse);
  // 7. Verify only records matching the reason filter are returned
  TestValidator.equals(
    "filtered records count matches",
    filteredResponse.data.length,
    2,
  );
  TestValidator.predicate("all filtered records contain 'restock'", () =>
    filteredResponse.data.every((record) =>
      record.reason.toLowerCase().includes("restock"),
    ),
  );
  // 8. Test pagination by requesting page 1 with limit 5
  const paginatedResponse =
    await api.functional.ecommerceMall.seller.inventory_history.index(
      sellerConnection,
      {
        body: {
          page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 5 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies IEcommerceMallInventoryRecord.IRequest,
      },
    );
  typia.assert(paginatedResponse);
  // 9. Verify pagination metadata is correct
  TestValidator.equals(
    "current page is 1",
    paginatedResponse.pagination.current,
    1,
  );
  TestValidator.equals("limit is 5", paginatedResponse.pagination.limit, 5);
  TestValidator.predicate(
    "records count is non-negative",
    paginatedResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    paginatedResponse.pagination.pages >= 0,
  );
  TestValidator.equals(
    "max 5 records per page",
    paginatedResponse.data.length <= 5,
    true,
  );
  // 10. Request page 2 to verify offset pagination works
  const page2Response =
    await api.functional.ecommerceMall.seller.inventory_history.index(
      sellerConnection,
      {
        body: {
          page: 2 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 5 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies IEcommerceMallInventoryRecord.IRequest,
      },
    );
  typia.assert(page2Response);
  // Verify offset pagination works (page 2 should have different records or be empty)
  TestValidator.equals(
    "page 2 current is 2",
    page2Response.pagination.current,
    2,
  );
  TestValidator.equals("page 2 limit is 5", page2Response.pagination.limit, 5);
  // 11. Verify each record includes nested variant summary
  for (const record of paginatedResponse.data) {
    TestValidator.predicate(
      "variant id exists",
      record.variant.id !== undefined,
    );
    TestValidator.predicate(
      "variant sku_code exists",
      record.variant.sku_code !== undefined,
    );
    TestValidator.predicate(
      "variant optionValues exists",
      record.variant.optionValues !== undefined,
    );
    TestValidator.predicate(
      "variant has price or null",
      record.variant.price === null || typeof record.variant.price === "number",
    );
    TestValidator.predicate(
      "variant quantity is non-negative",
      record.variant.quantity >= 0,
    );
  }
  // 12. Verify reason filter supports case-insensitive partial matching
  const caseInsensitiveResponse =
    await api.functional.ecommerceMall.seller.inventory_history.index(
      sellerConnection,
      {
        body: {
          reason: "RESTOCK",
        } satisfies IEcommerceMallInventoryRecord.IRequest,
      },
    );
  typia.assert(caseInsensitiveResponse);
  TestValidator.predicate(
    "case insensitive filter returns records",
    caseInsensitiveResponse.data.length > 0,
  );
  TestValidator.predicate("all records match case insensitive filter", () =>
    caseInsensitiveResponse.data.every((record) =>
      record.reason.toLowerCase().includes("restock"),
    ),
  );
}
