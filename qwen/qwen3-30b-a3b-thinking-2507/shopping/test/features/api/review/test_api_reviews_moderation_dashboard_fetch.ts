import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallReviewDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewDashboard";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_reviews_moderation_dashboard_fetch(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create new admin account
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 2. Access moderation dashboard endpoint
  const dashboard: IShoppingMallReviewDashboard =
    await api.functional.shoppingMall.admin.reviews.moderation.dashboard.index(
      adminConnection,
    );
  typia.assert(dashboard);
  // 3. Validate specific expected values for new admin account
  TestValidator.equals(
    "dashboard should have zero reviews",
    dashboard.pending_reviews_count,
    0,
  );
  TestValidator.equals(
    "dashboard should have zero flagged reviews",
    dashboard.flagged_reviews_count,
    0,
  );
  TestValidator.equals(
    "dashboard should have zero average sentiment score",
    dashboard.average_sentiment_score,
    0,
  );
  TestValidator.equals(
    "dashboard should have zero flagging rate",
    dashboard.flagging_rate,
    0,
  );
  TestValidator.equals(
    "dashboard should have empty review list",
    dashboard.pending_reviews.length,
    0,
  );
}
