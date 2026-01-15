import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallProductOverview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOverview";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_admin_product_overview_access(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth: IShoppingMallAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallAdmin.IJoin,
    },
  );
  typia.assert(adminAuth);
  // Step 2: Call the product overview endpoint with authenticated admin connection
  const overview: IShoppingMallProductOverview =
    await api.functional.shoppingMall.admin.dashboard.products.overview.index(
      adminConnection,
    );
  typia.assert(overview);
  // Step 3: Validate all required fields exist and have correct types
  TestValidator.predicate(
    "total_sales is a positive number",
    overview.total_sales >= 0,
  );
  TestValidator.predicate(
    "average_conversion_rate is between 0 and 1",
    overview.average_conversion_rate >= 0 &&
      overview.average_conversion_rate <= 1,
  );
  TestValidator.predicate(
    "top_selling_product_id is a valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      overview.top_selling_product_id,
    ),
  );
  TestValidator.predicate(
    "top_selling_product_sales is a positive number",
    overview.top_selling_product_sales >= 0,
  );
}
