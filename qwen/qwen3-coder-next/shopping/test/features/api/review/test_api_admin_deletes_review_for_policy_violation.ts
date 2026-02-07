import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";

/**
 * Test scenario for an administrator successfully deleting any customer review for policy violations.
 * This scenario validates the administrative override capability for reviewing and removing inappropriate content.
 *
 * Implementation note: The current API doesn't support direct review creation or reading,
 * only deletion via erase function. This test validates the deletion capability using
 * a mock review ID since we cannot create reviews through the available API endpoints.
 */
export async function test_api_admin_deletes_review_for_policy_violation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin login for authorization
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: typia.random<IShoppingMallAdmin.ILogin>(),
  });
  // 2. Customer login
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_login(customerConnection, {
    body: typia.random<IShoppingMallCustomer.ILogin>(),
  });
  // 3. Customer creates an order
  const order = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    {
      body: typia.random<IShoppingMallOrder.ICreate>(),
    },
  );
  typia.assert(order);
  // 4. Admin deletes a review for policy violation
  // Since we can't create reviews via API, use a generated review ID
  const reviewId = typia.random<string & tags.Format<"uuid">>();
  const deleted = await api.functional.shoppingMall.customer.reviews.erase(
    adminConnection,
    {
      reviewId: reviewId,
    },
  );
  typia.assert(deleted);
  // 5. Verify the review was deleted (404 expected when trying to access)
  // Note: There's no read function in the reviews API, so we validate by attempting
  // to delete the same review again and expecting an error
  await TestValidator.error(
    "review deleted and cannot be deleted again",
    async () => {
      await api.functional.shoppingMall.customer.reviews.erase(
        adminConnection,
        {
          reviewId: reviewId,
        },
      );
    },
  );
}
