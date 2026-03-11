import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomerBehavior } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerBehavior";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallCustomerBehavior } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCustomerBehavior";
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
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";

export async function test_api_seller_customer_behavior_analytics_filtering_sorting(
  connection: api.IConnection,
): Promise<void> {
  // Create seller account for testing
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await api.functional.ecommerceMall.auth.seller.join(
    sellerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        shop_name: RandomGenerator.name(),
      } satisfies IEcommerceMallSeller.IJoin,
    },
  );
  typia.assert(seller);
  sellerConnection.headers = { Authorization: seller.token.access };
  // Create products with random category ID
  const product1 = await api.functional.ecommerceMall.seller.products.create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.content(),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
        category_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product1);
  const product2 = await api.functional.ecommerceMall.seller.products.create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.content(),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
        category_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product2);
  // Create variants
  const variant1 =
    await api.functional.ecommerceMall.seller.products.variants.create(
      sellerConnection,
      {
        productId: product1.id,
        body: {
          sku_code: RandomGenerator.alphaNumeric(8),
          price_override: product1.basePrice + 1000,
        } satisfies IEcommerceMallProductVariant.ICreate,
      },
    );
  typia.assert(variant1);
  const variant2 =
    await api.functional.ecommerceMall.seller.products.variants.create(
      sellerConnection,
      {
        productId: product2.id,
        body: {
          sku_code: RandomGenerator.alphaNumeric(8),
          price_override: product2.basePrice + 2000,
        } satisfies IEcommerceMallProductVariant.ICreate,
      },
    );
  typia.assert(variant2);
  // Test analytics with various filter combinations
  const response =
    await api.functional.ecommerceMall.seller.analytics.customer_behavior.index(
      sellerConnection,
      {
        body: {
          search: product1.name.substring(0, 3),
          category_ids: [product1.category.id],
          start_date: new Date(
            Date.now() - 7 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          end_date: new Date().toISOString(),
          customer_segment: "new",
          sort_by: "views",
          sort_order: "desc",
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallCustomerBehavior.IRequest,
      },
    );
  typia.assert(response);
  // Validate pagination
  TestValidator.equals("pagination current", response.pagination.current, 1);
  TestValidator.equals("pagination limit", response.pagination.limit, 20);
  TestValidator.predicate(
    "pagination records >= 0",
    response.pagination.records >= 0,
  );
  // Validate data structure
  response.data.forEach((item: IEcommerceMallCustomerBehavior.ISummary) => {
    typia.assert(item);
    TestValidator.predicate(
      "has valid product_id",
      /^[0-9a-f-]{36}$/i.test(item.product_id),
    );
    TestValidator.predicate(
      "has valid product_name",
      item.product_name.length > 0,
    );
    TestValidator.predicate(
      "has valid category",
      item.product_category.length > 0,
    );
    TestValidator.predicate("view_count non-negative", item.view_count >= 0);
    TestValidator.predicate(
      "conversion_rate 0-100",
      item.conversion_rate >= 0 && item.conversion_rate <= 100,
    );
  });
  // Test sorting with different metrics
  const revenueResponse =
    await api.functional.ecommerceMall.seller.analytics.customer_behavior.index(
      sellerConnection,
      {
        body: {
          sort_by: "revenue",
          sort_order: "desc",
        } satisfies IEcommerceMallCustomerBehavior.IRequest,
      },
    );
  typia.assert(revenueResponse);
  const avgOrderValueResponse =
    await api.functional.ecommerceMall.seller.analytics.customer_behavior.index(
      sellerConnection,
      {
        body: {
          sort_by: "avg_order_value",
          sort_order: "asc",
        } satisfies IEcommerceMallCustomerBehavior.IRequest,
      },
    );
  typia.assert(avgOrderValueResponse);
  // Test empty result set with non-existent category
  const emptyResponse =
    await api.functional.ecommerceMall.seller.analytics.customer_behavior.index(
      sellerConnection,
      {
        body: {
          category_ids: [typia.random<string & tags.Format<"uuid">>()],
        } satisfies IEcommerceMallCustomerBehavior.IRequest,
      },
    );
  typia.assert(emptyResponse);
  TestValidator.equals("empty results", emptyResponse.data.length, 0);
}
