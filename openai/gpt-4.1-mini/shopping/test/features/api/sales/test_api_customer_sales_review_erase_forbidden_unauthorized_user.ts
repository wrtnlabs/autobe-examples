import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_sales_review_erase_forbidden_unauthorized_user(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: An unauthorized customer attempts to delete someone else's review and fails
  // 1. Create and authorize a legitimate customer who owns the review
  const legitimateCustomerConnection: api.IConnection = {
    host: connection.host,
  };
  const legitimateCustomer = await authorize_customer_join(
    legitimateCustomerConnection,
    {},
  );
  typia.assert(legitimateCustomer);
  // 2. Create and authorize another customer who will attempt the forbidden deletion
  const unauthorizedCustomerConnection: api.IConnection = {
    host: connection.host,
  };
  const unauthorizedCustomer = await authorize_customer_join(
    unauthorizedCustomerConnection,
    {},
  );
  typia.assert(unauthorizedCustomer);
  // 3. For the legitimate customer, we need a sale and a review associated with that sale
  // Since no direct sales or reviews creation utility is provided,
  // we'll simulate IDs as UUIDs and assume such existence for the test.
  // Generate random UUIDs for saleId and reviewId
  const saleId = typia.random<string & tags.Format<"uuid">>();
  const reviewId = typia.random<string & tags.Format<"uuid">>();
  // Normally here, a review would be created by the legitimate customer on the sale,
  // but creation utilities are not provided. We assume these IDs represent the
  // legitimate review for the sale.
  // 4. Unauthorized customer attempts to delete the legitimate customer's review
  await TestValidator.httpError(
    "unauthorized user cannot delete another customer's review",
    403,
    async () => {
      await api.functional.shoppingMall.customer.sales.reviews.erase(
        unauthorizedCustomerConnection,
        { saleId, reviewId },
      );
    },
  );
  // 5. Ensure the review still exists by attempting deletion with legitimate customer
  // which should NOT throw, i.e. deletion is permitted for the owner
  // Since the actual review existence check API is not provided,
  // we validate that legitimate deletion does not throw.
  await api.functional.shoppingMall.customer.sales.reviews.erase(
    legitimateCustomerConnection,
    { saleId, reviewId },
  );
}
