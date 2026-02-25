import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductReviewSnapshot";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProductReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReview";
import type { IShoppingMallProductReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReviewSnapshot";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * This E2E test verifies that accessing the product review snapshots endpoint without proper authorization results in a 403 Forbidden error.
 * It creates a base connection and executes the PATCH /shoppingMall/productReviewSnapshots with a valid filter request body,
 * but without any authentication headers. The test ensures that the API correctly enforces access control by rejecting unauthorized requests.
 */
export async function test_api_product_review_snapshots_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // Use base connection without authorization
  const baseConnection: api.IConnection = { host: connection.host };
  // Prepare a valid request body for product review snapshots index
  const body = typia.random<IShoppingMallProductReviewSnapshot.IRequest>();
  // Attempt to access the endpoint without authorization and expect a 403 error
  await TestValidator.httpError(
    "unauthorized access to product review snapshots should be forbidden",
    403,
    async () => {
      await api.functional.shoppingMall.productReviewSnapshots.index(
        baseConnection,
        { body },
      );
    },
  );
}
