import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallDashboard";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";

export async function test_api_seller_dashboard_statistics_updates(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
    },
  });
  typia.assert(seller);
  // 2. Get initial dashboard statistics
  const initialStats =
    await api.functional.ecommerceMall.seller.analytics.dashboard.at(
      sellerConnection,
      {
        body: {},
      },
    );
  typia.assert(initialStats);
  // 3. Create first product and verify totalProducts increases
  const product1 = await api.functional.ecommerceMall.seller.products.create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        base_price: typia.random<
          number &
            tags.Type<"uint32"> &
            tags.Minimum<1000> &
            tags.Maximum<100000>
        >(),
        is_available: true,
        category_id: typia.random<string & tags.Format<"uuid">>(),
      },
    },
  );
  typia.assert(product1);
  const statsAfterProduct1 =
    await api.functional.ecommerceMall.seller.analytics.dashboard.at(
      sellerConnection,
      {
        body: {},
      },
    );
  typia.assert(statsAfterProduct1);
  TestValidator.equals(
    "totalProducts increased by 1",
    statsAfterProduct1.totalProducts,
    initialStats.totalProducts + 1,
  );
  // 4. Create second product and verify totalProducts increases again
  const product2 = await api.functional.ecommerceMall.seller.products.create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        base_price: typia.random<
          number &
            tags.Type<"uint32"> &
            tags.Minimum<1000> &
            tags.Maximum<100000>
        >(),
        is_available: true,
        category_id: typia.random<string & tags.Format<"uuid">>(),
      },
    },
  );
  typia.assert(product2);
  const statsAfterProduct2 =
    await api.functional.ecommerceMall.seller.analytics.dashboard.at(
      sellerConnection,
      {
        body: {},
      },
    );
  typia.assert(statsAfterProduct2);
  TestValidator.equals(
    "totalProducts increased by 2",
    statsAfterProduct2.totalProducts,
    initialStats.totalProducts + 2,
  );
  // 5. Verify other statistics remain at initial values
  const finalStats =
    await api.functional.ecommerceMall.seller.analytics.dashboard.at(
      sellerConnection,
      {
        body: {},
      },
    );
  typia.assert(finalStats);
  TestValidator.equals(
    "final totalProducts",
    finalStats.totalProducts,
    initialStats.totalProducts + 2,
  );
  TestValidator.equals(
    "pendingCancellationRequests",
    finalStats.pendingCancellationRequests,
    0,
  );
  TestValidator.equals(
    "pendingRefundRequests",
    finalStats.pendingRefundRequests,
    0,
  );
  TestValidator.equals(
    "totalOrderItemsSold",
    finalStats.totalOrderItemsSold,
    0,
  );
}
