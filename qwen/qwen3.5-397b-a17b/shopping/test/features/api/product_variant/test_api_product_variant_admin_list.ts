import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductVariant";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test administrator viewing product variants for oversight purposes.
 *
 * Validates the admin authentication flow and product variants listing endpoint structure. Tests that administrators can authenticate and access the variants listing API with proper pagination and response validation.
 *
 * Note: Full scenario testing with actual products and variants requires additional utility functions for seller account creation, product management, variant creation, and inventory records which are not available in the current test environment. This test focuses on validating the admin authentication mechanism and endpoint response structure.
 *
 * 1. Administrator account created via authorize_admin_join utility.
 * 2. Admin connection established with authentication token.
 * 3. Product variants endpoint called with pagination parameters.
 * 4. Response validated against IPageIShoppingMallProductVariant.ISummary schema.
 */
export async function test_api_product_variant_admin_list(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create administrator account and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      grade: RandomGenerator.pick(["regular", "super"] as const),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Call product variants listing endpoint
  // Note: Without product/variant creation utilities, we test with a random UUID
  // In production, this would use an actual product ID from created product
  const productId = typia.random<string & tags.Format<"uuid">>();
  const response =
    await api.functional.shoppingMall.admin.products.variants.index(
      adminConnection,
      {
        productId,
        body: {
          page: 1,
          limit: 20,
          sort: "created_at_desc",
        } satisfies IShoppingMallProductVariant.IRequest,
      },
    );
  typia.assert(response);
  // 3. Validate pagination metadata relationships (business logic, not type)
  TestValidator.predicate(
    "pages calculated correctly",
    response.pagination.pages ===
      Math.ceil(response.pagination.records / response.pagination.limit),
  );
  TestValidator.equals(
    "current page matches request",
    response.pagination.current,
    1,
  );
  TestValidator.equals("limit matches request", response.pagination.limit, 20);
}
