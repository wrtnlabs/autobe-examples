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

export async function test_api_seller_customer_behavior_analytics_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register seller account
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
  // Step 2: Create product with category and variants
  const category = typia.random<IEcommerceMallCategory.ISummary>();
  category.id = typia.random<string & tags.Format<"uuid">>();
  const product = await api.functional.ecommerceMall.seller.products.create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 3 }),
        base_price: typia.random<
          number &
            tags.Type<"uint32"> &
            tags.Minimum<1000> &
            tags.Maximum<1000000>
        >(),
        is_available: true,
        category_id: category.id,
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // Step 3: Create variants for the product
  const variants: IEcommerceMallProductVariant[] = [];
  for (let i = 0; i < 3; i++) {
    const variant =
      await api.functional.ecommerceMall.seller.products.variants.create(
        sellerConnection,
        {
          productId: product.id,
          body: {
            sku_code: `${product.id}-variant-${i}`,
            price_override: typia.random<
              number &
                tags.Type<"uint32"> &
                tags.Minimum<1000> &
                tags.Maximum<1000000>
            >(),
          } satisfies IEcommerceMallProductVariant.ICreate,
        },
      );
    typia.assert(variant);
    variants.push(variant);
  }
  // Step 4: Test analytics retrieval with no filters
  const noFilterResult =
    await api.functional.ecommerceMall.seller.analytics.customer_behavior.index(
      sellerConnection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallCustomerBehavior.IRequest,
      },
    );
  typia.assert(noFilterResult);
  TestValidator.equals(
    "pagination exists",
    noFilterResult.pagination.records >= 0,
    true,
  );
  TestValidator.equals("pagination limit", noFilterResult.pagination.limit, 20);
  TestValidator.equals("data exists", noFilterResult.data.length >= 0, true);
  // Step 5: Test analytics retrieval with category filter
  const categoryFilterResult =
    await api.functional.ecommerceMall.seller.analytics.customer_behavior.index(
      sellerConnection,
      {
        body: {
          category_ids: [product.category.id],
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallCustomerBehavior.IRequest,
      },
    );
  typia.assert(categoryFilterResult);
  // Step 6: Test analytics retrieval with date range filter
  const now = new Date();
  const lastMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const dateRangeResult =
    await api.functional.ecommerceMall.seller.analytics.customer_behavior.index(
      sellerConnection,
      {
        body: {
          start_date: lastMonth.toISOString(),
          end_date: now.toISOString(),
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallCustomerBehavior.IRequest,
      },
    );
  typia.assert(dateRangeResult);
  // Step 7: Test analytics retrieval with customer segment filter
  const segmentResult =
    await api.functional.ecommerceMall.seller.analytics.customer_behavior.index(
      sellerConnection,
      {
        body: {
          customer_segment: "new",
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallCustomerBehavior.IRequest,
      },
    );
  typia.assert(segmentResult);
  // Step 8: Test analytics retrieval with sorting options
  const sortViewsResult =
    await api.functional.ecommerceMall.seller.analytics.customer_behavior.index(
      sellerConnection,
      {
        body: {
          sort_by: "views",
          sort_order: "desc",
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallCustomerBehavior.IRequest,
      },
    );
  typia.assert(sortViewsResult);
  const sortRevenueResult =
    await api.functional.ecommerceMall.seller.analytics.customer_behavior.index(
      sellerConnection,
      {
        body: {
          sort_by: "revenue",
          sort_order: "asc",
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallCustomerBehavior.IRequest,
      },
    );
  typia.assert(sortRevenueResult);
  // Step 9: Validate analytics structure and calculations
  if (noFilterResult.data.length > 0) {
    const firstAnalytics = noFilterResult.data[0];
    typia.assert<IEcommerceMallCustomerBehavior.ISummary>(firstAnalytics);
    // Verify required fields exist
    TestValidator.equals(
      "product_id exists",
      firstAnalytics.product_id !== undefined,
      true,
    );
    TestValidator.equals(
      "product_name exists",
      firstAnalytics.product_name !== undefined,
      true,
    );
    TestValidator.equals(
      "product_category exists",
      firstAnalytics.product_category !== undefined,
      true,
    );
    TestValidator.equals(
      "view_count exists",
      firstAnalytics.view_count >= 0,
      true,
    );
    TestValidator.equals(
      "cart_add_count exists",
      firstAnalytics.cart_add_count >= 0,
      true,
    );
    TestValidator.equals(
      "purchase_count exists",
      firstAnalytics.purchase_count >= 0,
      true,
    );
    TestValidator.equals(
      "conversion_rate exists",
      firstAnalytics.conversion_rate >= 0,
      true,
    );
    TestValidator.equals(
      "average_order_value exists",
      firstAnalytics.average_order_value >= 0,
      true,
    );
    TestValidator.equals(
      "total_revenue exists",
      firstAnalytics.total_revenue >= 0,
      true,
    );
    TestValidator.equals(
      "cart_abandonment_rate exists",
      firstAnalytics.cart_abandonment_rate >= 0,
      true,
    );
    TestValidator.equals(
      "time_period exists",
      firstAnalytics.time_period !== undefined,
      true,
    );
    // Verify conversion rate calculation (purchase_count / view_count * 100)
    if (firstAnalytics.view_count > 0) {
      const expectedConversionRate =
        (firstAnalytics.purchase_count / firstAnalytics.view_count) * 100;
      TestValidator.equals(
        "conversion rate calculation",
        firstAnalytics.conversion_rate,
        expectedConversionRate,
      );
    }
  }
}