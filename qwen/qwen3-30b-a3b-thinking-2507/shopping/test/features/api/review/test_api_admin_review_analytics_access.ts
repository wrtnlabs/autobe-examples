import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReviewAnalytics } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReviewAnalytics";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallReviewAnalytics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewAnalytics";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_admin_review_analytics_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account with unique email
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAccount = await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      password: "password123",
      name: RandomGenerator.name(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(adminAccount);
  // 2. Retrieve review analytics data
  const analytics =
    await api.functional.shoppingMall.admin.reviews.analytics.ratings.index(
      adminConnection,
    );
  typia.assert(analytics);
  // 3. Validate analytics response structure
  TestValidator.equals("pagination structure is valid", analytics.pagination, {
    current: 1,
    limit: 10,
    records: 0,
    pages: 0,
  });
}
