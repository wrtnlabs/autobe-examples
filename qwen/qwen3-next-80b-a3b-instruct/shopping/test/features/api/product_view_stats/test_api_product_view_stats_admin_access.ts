import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IProductVariantAttributes } from "@ORGANIZATION/PROJECT-api/lib/structures/IProductVariantAttributes";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductPageFeaturesUsed } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductPageFeaturesUsed";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductViewByCustomerType } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductViewByCustomerType";
import type { IShoppingMallProductViewBySource } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductViewBySource";
import type { IShoppingMallProductViewDeviceDistribution } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductViewDeviceDistribution";
import type { IShoppingMallProductViewRegionDistribution } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductViewRegionDistribution";
import type { IShoppingMallProductViewStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductViewStat";
import type { IShoppingMallProductViewTrendByHour } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductViewTrendByHour";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerBillingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerBillingAddress";
import type { IShoppingMallSellerOnboardingProgress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerOnboardingProgress";
import type { IShoppingMallSellerPayoutSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPayoutSettings";
import type { IShoppingMallSellerPerformanceMetrics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPerformanceMetrics";
import type { IShoppingMallSellerSocialMediaHandles } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSocialMediaHandles";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_admin_products_skus_create } from "../../../generate/generate_random_shopping_mall_admin_products_skus_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_product_view_stats_admin_access(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAccount: IShoppingMallAdmin.IAuthorized =
    await authorize_admin_join(adminConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "",  // Required by IJoin interface
        referrer: "",  // Required by IJoin interface
      } satisfies IShoppingMallAdmin.IJoin,
    });
  // Step 2: Create a separate connection and authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAccount: IShoppingMallSeller.IAuthorized =
    await authorize_member_join(sellerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        business_name: RandomGenerator.name(),
        contact_phone: RandomGenerator.mobile(),
        createdAt: new Date().toISOString(),
      } satisfies IShoppingMallSeller.IJoin,
    });
  // Step 3: Create a product using the seller connection and utility function
  const product: IShoppingMallProduct =
    await generate_random_shopping_mall_seller_products_create(
      sellerConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.content({ paragraphs: 1 }),
          categoryId: typia.random<string & tags.Format<"uuid">>(),
          price: (typia.random<number & tags.Minimum<0.01>>() satisfies number as number),
          sku: RandomGenerator.alphaNumeric(10),
          images: [typia.random<string & tags.Format<"uri">>()],
        } satisfies IShoppingMallProduct.ICreate,
      },
    );
  typia.assert(product);
  // Step 4: Create a product variant using the seller connection and utility function
  const variant: IShoppingMallProductVariant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
        },
        body: {
          attributes: RandomGenerator.alphaNumeric(16), // IProductVariantAttributes is a string type
          price: (typia.random<number & tags.Minimum<0.01>>() satisfies number as number),
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // Step 5: Create a SKU for the product variant using admin connection and utility function
  const sku: IShoppingMallProductVariant =
    await generate_random_shopping_mall_admin_products_skus_create(
      adminConnection,
      {
        body: {
          attributes: RandomGenerator.alphaNumeric(16), // IProductVariantAttributes is a string type
          price: (typia.random<number & tags.Minimum<0.01>>() satisfies number as number),
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(sku);
  // Step 6: Admin attempts to retrieve product view statistics
  const viewStats: IShoppingMallProductViewStat =
    await api.functional.shoppingMall.admin.products.view_stats.at(
      adminConnection,
      {
        productId: product.id,
      },
    );
  typia.assert(viewStats);
  // Step 7: Validate the core statistics fields
  TestValidator.equals(
    "product ID in stats matches requested product",
    viewStats.product_id,
    product.id,
  );
  TestValidator.predicate("total views >= 0", viewStats.total_views >= 0);
  TestValidator.predicate("unique views >= 0", viewStats.unique_views >= 0);
  TestValidator.predicate(
    "view duration >= 0",
    viewStats.view_duration_seconds >= 0,
  );
  TestValidator.predicate(
    "conversion rate between 0 and 1",
    viewStats.conversion_rate_to_cart >= 0 &&
      viewStats.conversion_rate_to_cart <= 1,
  );
  // Step 8: Validate that distribution data exists (all are objects)
  TestValidator.predicate(
    "region distribution exists",
    viewStats.region_distribution !== undefined,
  );
  TestValidator.predicate(
    "device distribution exists",
    viewStats.device_type_distribution !== undefined,
  );
  TestValidator.predicate(
    "trend by hour exists",
    viewStats.view_trend_by_hour !== undefined,
  );
  TestValidator.predicate(
    "by source exists",
    viewStats.view_by_source !== undefined,
  );
  TestValidator.predicate(
    "by customer type exists",
    viewStats.view_by_customer_type !== undefined,
  );
  TestValidator.predicate(
    "page features used exists",
    viewStats.page_features_used !== undefined,
  );
  // Step 9: Verify that non-admin users cannot access product view stats
  const userConnection: api.IConnection = { host: connection.host };
  const userAccount: IShoppingMallSeller.IAuthorized =
    await authorize_member_join(userConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        business_name: RandomGenerator.name(),
        contact_phone: RandomGenerator.mobile(),
        createdAt: new Date().toISOString(),
      } satisfies IShoppingMallSeller.IJoin,
    });
  await TestValidator.error(
    "non-admin cannot access product view stats",
    async () => {
      await api.functional.shoppingMall.admin.products.view_stats.at(
        userConnection,
        {
          productId: product.id,
        },
      );
    },
  );
} 