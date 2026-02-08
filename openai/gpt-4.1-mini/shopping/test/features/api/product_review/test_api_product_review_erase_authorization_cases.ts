import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_product_review_erase_authorization_cases(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Successful deletion of a product review by an authorized admin user.
  // Scenario 2: Successful deletion of a product review by the owner customer.
  // Scenario 3: Unauthorized deletion attempt by a customer who is not the owner.
  // Admin join and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinPayload = typia.random<IShoppingMallAdministrator.IJoin>();
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: adminJoinPayload,
  });
  typia.assert(adminAuth);
  // Customer A join and authenticate
  const customerAConnection: api.IConnection = { host: connection.host };
  const customerAJoinPayload = typia.random<IShoppingMallCustomer.IJoin>();
  const customerAAuth = await authorize_customer_join(customerAConnection, {
    body: customerAJoinPayload,
  });
  typia.assert(customerAAuth);
  // Customer B join and authenticate
  const customerBConnection: api.IConnection = { host: connection.host };
  const customerBJoinPayload = typia.random<IShoppingMallCustomer.IJoin>();
  const customerBAuth = await authorize_customer_join(customerBConnection, {
    body: customerBJoinPayload,
  });
  typia.assert(customerBAuth);
  // NOTE: The scenario requires creating product reviews by customers.
  // However, no API function or utility for creating product reviews is provided.
  // For testing purpose, use generated UUIDs as product review IDs.
  // Scenario 1: Admin deletes a product review owned by Customer A
  const productReviewId = typia.random<string & tags.Format<"uuid">>();
  // Admin deletes product review
  await api.functional.shoppingMall.productReviews.erase(adminConnection, {
    productReviewId,
  });
  // Scenario 2: Customer A deletes their own product review
  const ownReviewId = typia.random<string & tags.Format<"uuid">>();
  await api.functional.shoppingMall.productReviews.erase(customerAConnection, {
    productReviewId: ownReviewId,
  });
  // Scenario 3: Customer B attempts to delete a review owned by Customer A
  await TestValidator.error(
    "unauthorized deletion by another customer",
    async () => {
      await api.functional.shoppingMall.productReviews.erase(
        customerBConnection,
        { productReviewId },
      );
    },
  );
}
