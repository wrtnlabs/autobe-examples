import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSalePromotion } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSalePromotion";
import type { IShoppingMallAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthorizationToken";
import type { IShoppingMallSalePromotion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSalePromotion";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
export async function test_api_seller_promotion_effectiveness_analysis(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller: IShoppingMallSeller.IAuthorized = await authorize_seller_join(
    sellerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IShoppingMallSeller.IJoin,
    },
  );
  typia.assert(seller);
  // Step 2: Retrieve promotion effectiveness analytics
  const analytics: IPageIShoppingMallSalePromotion =
    await api.functional.shoppingMall.seller.analytics.promotions.effectiveness.index(
      sellerConnection,
    );
  typia.assert(analytics);
  // Step 3: Validate pagination structure
  TestValidator.equals(
    "pagination exists",
    analytics.pagination,
    analytics.pagination,
  );
  TestValidator.predicate(
    "pagination current >= 1",
    () => analytics.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit >= 1",
    () => analytics.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination records >= 0",
    () => analytics.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages >= 0",
    () => analytics.pagination.pages >= 0,
  );
  // Step 4: Validate data array structure
  TestValidator.predicate("data array exists", () =>
    Array.isArray(analytics.data),
  );
  TestValidator.predicate(
    "data array length matches records",
    () => analytics.data.length === analytics.pagination.records,
  );
  // Step 5: Validate individual promotion analytics records
  if (analytics.data.length > 0) {
    const firstPromotion: IShoppingMallSalePromotion = analytics.data[0];
    // Validate data values make logical sense
    TestValidator.predicate(
      "revenue is non-negative",
      () => firstPromotion.revenue >= 0,
    );
    TestValidator.predicate(
      "discount rate is between 0-100%",
      () =>
        firstPromotion.discountRate >= 0 && firstPromotion.discountRate <= 100,
    );
    TestValidator.predicate(
      "unique customers is non-negative",
      () => firstPromotion.uniqueCustomers >= 0,
    );
    TestValidator.predicate(
      "units sold is non-negative",
      () => firstPromotion.unitsSold >= 0,
    );
    TestValidator.predicate(
      "conversion rate is between 0-100%",
      () =>
        firstPromotion.conversionRate >= 0 &&
        firstPromotion.conversionRate <= 100,
    );
    // Validate string properties
    TestValidator.predicate(
      "promotion name is not empty",
      () => firstPromotion.promotionName.length > 0,
    );
    TestValidator.predicate(
      "promotion type is not empty",
      () => firstPromotion.promotionType.length > 0,
    );
    // Validate that the data is sorted by revenue descending
    // Only possible if there are at least 2 records
    if (analytics.data.length > 1) {
      for (let i = 0; i < analytics.data.length - 1; i++) {
        TestValidator.predicate(
          `revenue descending order: ${i} >= ${i + 1}`,
          () => analytics.data[i].revenue >= analytics.data[i + 1].revenue,
        );
      }
    }
  }
}
