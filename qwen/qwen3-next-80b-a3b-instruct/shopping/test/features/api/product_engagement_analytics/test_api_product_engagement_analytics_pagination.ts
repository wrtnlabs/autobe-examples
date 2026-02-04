import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProduct";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthorizationToken";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_product_engagement_analytics_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as admin to access analytics endpoint
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
  // Step 2: Call the analytics endpoint to get product engagement data
  const result =
    await api.functional.shoppingMall.admin.analytics.products.engagement.index(
      adminConnection,
    );
  typia.assert(result);
  // Step 3: Validate pagination metadata structure and types
  // All values must be positive integers (minimum 0 but as per schema minimum 0, and as context - records and pages should be at least 0, but practical context suggests at least 1 if data exists)
  TestValidator.predicate(
    "current page must be a positive integer",
    result.pagination.current >= 1,
  );
  TestValidator.predicate(
    "limit must be a positive integer",
    result.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "records must be a non-negative integer",
    result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages must be a non-negative integer",
    result.pagination.pages >= 0,
  );
  // Step 4: Validate that data is a non-null array of IShoppingMallProduct
  TestValidator.predicate("data array should be defined", result.data !== null);
  TestValidator.predicate("data should be array", Array.isArray(result.data));
  // Step 5: Validate that each product in data array is a valid IShoppingMallProduct
  // Note: IShoppingMallProduct is defined as an empty object {} - so we just validate it's an object
  for (const product of result.data) {
    TestValidator.predicate(
      "each product must be an object",
      typeof product === "object" && product !== null,
    );
    // Ensure no extra properties are accidentally added (should be empty object per definition)
    TestValidator.equals(
      "product should have exactly 0 properties",
      Object.keys(product).length,
      0,
    );
    // Additional validation: ensure no properties are accidentally present
    // For any property we try to access, we should get undefined, since the type is {}
    // But since we cannot add any properties with the exact {} type, this is validated by the schema
  }
  // Verify that pagination metadata logically follows from the data array
  TestValidator.predicate(
    "if records > 0, then pages should be at least 1",
    !!(result.pagination.records > 0) === !!(result.pagination.pages >= 1),
  );
  TestValidator.predicate(
    "if data.length > 0, then records should be >= data.length",
    result.pagination.records >= result.data.length,
  );
  TestValidator.predicate(
    "if there are products, then current page should be 1",
    result.data.length > 0 ? result.pagination.current === 1 : true,
  );
}
