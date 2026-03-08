import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IEAdministratorGrade";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallAdministratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorSession";
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
import { generate_random_shopping_mall_customer_requests_create } from "../../../generate/generate_random_shopping_mall_customer_requests_create";
import { prepare_random_shopping_mall_administrator_session } from "../../../prepare/prepare_random_shopping_mall_administrator_session";

export async function test_api_administrator_request_self_review_prevention(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a customer and submit administrator request
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(customer);
  // Step 2: Submit administrator request from customer
  const adminRequest =
    await generate_random_shopping_mall_customer_requests_create(
      customerConnection,
      {},
    );
  typia.assert(adminRequest);
  // Step 3: Create a regular administrator
  const regularAdminConnection: api.IConnection = { host: connection.host };
  const regularAdmin = await authorize_administrator_join(
    regularAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      },
    },
  );
  typia.assert(regularAdmin);
  // Verify regular admin has 'regular' grade
  TestValidator.equals("regular admin grade", regularAdmin.grade, "regular");
  // Step 4: Test that customer cannot review administrator request (not authorized)
  await TestValidator.error(
    "customer cannot review administrator request",
    async () => {
      await api.functional.shoppingMall.administrator.requests.review(
        customerConnection,
        {
          requestId: adminRequest.id,
          body: {
            decision: "approved",
          } satisfies IShoppingMallAdministratorSession.IReview,
        },
      );
    },
  );
  // Step 5: Test that regular administrator cannot review requests (requires super grade)
  await TestValidator.error(
    "regular administrator cannot review requests",
    async () => {
      await api.functional.shoppingMall.administrator.requests.review(
        regularAdminConnection,
        {
          requestId: adminRequest.id,
          body: {
            decision: "approved",
          } satisfies IShoppingMallAdministratorSession.IReview,
        },
      );
    },
  );
  // Note: Full self-review prevention testing requires:
  // 1. A seed super administrator account in the system
  // 2. That super admin to have submitted a request before becoming super
  // This test validates the authorization model that prevents unauthorized reviews.
}
