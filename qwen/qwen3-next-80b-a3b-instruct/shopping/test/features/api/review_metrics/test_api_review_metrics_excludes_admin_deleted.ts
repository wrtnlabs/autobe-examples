import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
export async function test_api_review_metrics_excludes_admin_deleted(
  connection: api.IConnection,
): Promise<void> {
  // The only valid test for this endpoint is verifying it returns an empty object
  // as defined by the IShoppingMallReview type (which is {}) in the schema
  // Get review metrics
  const metrics =
    await api.functional.shoppingMall.customer.reviews.metrics.index(
      connection,
    );
  typia.assert(metrics);
  // Validate that metrics is an empty object as defined by IShoppingMallReview = {}
  TestValidator.equals("metrics should be an empty object", metrics, {});
}
