import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSalePromotion } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSalePromotion";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthorizationToken";
import type { IShoppingMallSalePromotion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSalePromotion";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_promotion_effectiveness_analytics_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/join",
      referrer: "https://example.com",
      ip: "192.168.1.1",
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // Step 2: Call the analytics endpoint
  const result: IPageIShoppingMallSalePromotion =
    await api.functional.shoppingMall.admin.analytics.promotions.effectiveness.index(
      adminConnection,
    );
  // Step 3: Validate response structure with typia.assert (COMPLETE TYPE VALIDATION)
  typia.assert(result);
  // Step 4: Validate pagination structure
  TestValidator.equals(
    "pagination exists",
    result.pagination,
    result.pagination,
  );
  TestValidator.predicate("current page >= 1", result.pagination.current >= 1);
  TestValidator.predicate("limit > 0", result.pagination.limit > 0);
  TestValidator.predicate("records >= 0", result.pagination.records >= 0);
  TestValidator.predicate("pages >= 0", result.pagination.pages >= 0);
  // Step 5: Validate data array structure and business constraints
  TestValidator.predicate("data is array", Array.isArray(result.data));
  // Step 6: Validate business logic: results are sorted by revenue descending
  if (result.data.length >= 2) {
    for (let i = 0; i < result.data.length - 1; i++) {
      TestValidator.predicate(
        `promotion ${i} revenue >= promotion ${i + 1} revenue`,
        result.data[i].revenue >= result.data[i + 1].revenue,
      );
    }
  }
  // Step 7: Validate numeric value constraints
  for (const item of result.data) {
    TestValidator.predicate("revenue >= 0", item.revenue >= 0);
    TestValidator.predicate(
      "discountRate between 0 and 1",
      item.discountRate >= 0 && item.discountRate <= 1,
    );
    TestValidator.predicate("uniqueCustomers >= 0", item.uniqueCustomers >= 0);
    TestValidator.predicate("unitsSold >= 0", item.unitsSold >= 0);
    TestValidator.predicate(
      "conversionRate between 0 and 1",
      item.conversionRate >= 0 && item.conversionRate <= 1,
    );
    TestValidator.predicate(
      "promotionName is string",
      typeof item.promotionName === "string",
    );
    TestValidator.predicate(
      "promotionType is string",
      typeof item.promotionType === "string",
    );
  }
  // Step 8: Test non-admin access forbidden (ERROR SCENARIO)
  // Create customer connection here (no auth)
  const customerConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "customer cannot access promotion analytics",
    403,
    async () => {
      await api.functional.shoppingMall.admin.analytics.promotions.effectiveness.index(
        customerConnection,
      );
    },
  );
}
