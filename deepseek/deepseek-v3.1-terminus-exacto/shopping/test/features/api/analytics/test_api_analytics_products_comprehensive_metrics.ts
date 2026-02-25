import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceProductSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_analytics_products_comprehensive_metrics(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin_password_123",
    } satisfies IEcommerceAdministrator.IJoin,
  });
  // Step 2: Prepare analytics request with realistic filters
  const requestBody: IEcommerceProductSnapshot.IRequest = {
    created_at_from: new Date(
      Date.now() - 30 * 24 * 60 * 60 * 1000,
    ).toISOString(), // 30 days ago
    created_at_to: new Date().toISOString(),
    page: 1,
    limit: 10,
  } satisfies IEcommerceProductSnapshot.IRequest;
  // Step 3: Call analytics endpoint
  const response =
    await api.functional.ecommerce.administrator.analytics.products.index(
      adminConnection,
      { body: requestBody },
    );
  // Step 4: Validate response
  typia.assert(response);
  // Step 5: Verify pagination structure
  TestValidator.equals(
    "pagination exists",
    typeof response.pagination,
    "object",
  );
  TestValidator.predicate(
    "current page valid",
    response.pagination.current >= 0,
  );
  TestValidator.predicate("limit positive", response.pagination.limit > 0);
  TestValidator.predicate(
    "records non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate("pages non-negative", response.pagination.pages >= 0);
  // Step 6: Verify data array structure
  TestValidator.equals("data is array", Array.isArray(response.data), true);
  if (response.data.length > 0) {
    const sampleProduct = response.data[0];
    TestValidator.predicate(
      "product has id",
      typeof sampleProduct.id === "string",
    );
    TestValidator.predicate(
      "product has name",
      typeof sampleProduct.name === "string",
    );
    TestValidator.predicate(
      "product has base_price",
      typeof sampleProduct.base_price === "number",
    );
    TestValidator.predicate(
      "product has seller_id",
      typeof sampleProduct.seller_id === "string",
    );
    TestValidator.predicate(
      "product has category_id",
      typeof sampleProduct.category_id === "string",
    );
    TestValidator.predicate(
      "product has created_at",
      typeof sampleProduct.created_at === "string",
    );
  }
}
