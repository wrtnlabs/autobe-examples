import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import type { IEcommerceMallProductAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductAnalytic";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_product_analytics_complete_data(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator registration and authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminResult = await authorize_administrator_join(adminConnection, {
    body: {
      display_name: RandomGenerator.name(2),
      email: typia.random<string & tags.Format<"email">>(),
      password: "securePassword123",
      grade: "regular" as const,
    } satisfies IEcommerceMallAdministrator.IJoin,
  });
  typia.assert(adminResult);
  // 2. Retrieve analytics for a specific product
  const productId = typia.random<string & tags.Format<"uuid">>();
  const analytics =
    await api.functional.ecommerceMall.administrator.products.analytics(
      adminConnection,
      { id: productId },
    );
  typia.assert(analytics);
  // 3. Validate response structure and data types
  TestValidator.predicate(
    "product_id is valid UUID",
    /^[0-9a-f-]{36}$/i.test(analytics.product_id),
  );
  TestValidator.predicate(
    "seller_id is valid UUID",
    /^[0-9a-f-]{36}$/i.test(analytics.seller_id),
  );
  TestValidator.predicate(
    "category_id is valid UUID",
    /^[0-9a-f-]{36}$/i.test(analytics.category_id),
  );
  // 4. Verify numeric fields are non-negative
  TestValidator.predicate(
    "total_sales_count is non-negative",
    analytics.total_sales_count >= 0,
  );
  TestValidator.predicate(
    "total_revenue is non-negative",
    analytics.total_revenue >= 0,
  );
  TestValidator.predicate(
    "total_inventory is non-negative",
    analytics.total_inventory >= 0,
  );
  TestValidator.predicate(
    "total_variants is non-negative",
    analytics.total_variants >= 0,
  );
  TestValidator.predicate(
    "in_stock_variants is non-negative",
    analytics.in_stock_variants >= 0,
  );
  TestValidator.predicate(
    "total_reviews is non-negative",
    analytics.total_reviews >= 0,
  );
  // 5. Validate average_rating range (0 to 5)
  TestValidator.predicate(
    "average_rating between 0 and 5",
    analytics.average_rating >= 0 && analytics.average_rating <= 5,
  );
  // 6. Validate is_available consistency with in_stock_variants
  const expectedAvailability = analytics.in_stock_variants > 0;
  TestValidator.equals(
    "is_available matches in_stock_variants",
    analytics.is_available,
    expectedAvailability,
  );
  // 7. Validate int32 types for count fields
  TestValidator.predicate(
    "total_sales_count is integer",
    Number.isInteger(analytics.total_sales_count),
  );
  TestValidator.predicate(
    "total_inventory is integer",
    Number.isInteger(analytics.total_inventory),
  );
  TestValidator.predicate(
    "total_variants is integer",
    Number.isInteger(analytics.total_variants),
  );
  TestValidator.predicate(
    "in_stock_variants is integer",
    Number.isInteger(analytics.in_stock_variants),
  );
  TestValidator.predicate(
    "total_reviews is integer",
    Number.isInteger(analytics.total_reviews),
  );
  // 8. Verify response contains all required fields
  const requiredFields: (keyof IEcommerceMallProductAnalytic)[] = [
    "product_id",
    "seller_id",
    "category_id",
    "total_sales_count",
    "total_revenue",
    "total_inventory",
    "total_variants",
    "in_stock_variants",
    "total_reviews",
    "average_rating",
    "is_available",
  ];
  for (const field of requiredFields) {
    TestValidator.predicate(
      `${field} exists and is defined`,
      analytics[field] !== undefined,
    );
  }
}
