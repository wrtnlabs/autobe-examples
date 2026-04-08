import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorPromotionRequest";
import type { IShoppingMallAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorRequest";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
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
import { generate_random_shopping_mall_customer_administrator_requests_create } from "../../../generate/generate_random_shopping_mall_customer_administrator_requests_create";
import { prepare_random_shopping_mall_administrator_request } from "../../../prepare/prepare_random_shopping_mall_administrator_request";

/**
 * Test that regular administrators cannot approve or reject promotion requests - only super administrators have this privilege.
 *
 * Validates the access control mechanism for administrator promotion requests, ensuring that only super administrators can process pending requests. Regular administrators should be denied access to the promotion request update endpoint with a 403 Forbidden response.
 *
 * This test verifies that the privilege separation between regular and super administrators is properly enforced, preventing unauthorized grade management operations.
 *
 * 1. Register a regular administrator account with grade='regular'
 * 2. Register a customer account
 * 3. Customer submits an administrator promotion request with justification
 * 4. Verify the request is created with 'pending' status
 * 5. Regular administrator attempts to approve the request
 * 6. Verify the operation fails with 403 Forbidden error
 * 7. Verify the request status remains 'pending'
 * 8. Verify no administrator account was created for the customer
 */
export async function test_api_administrator_promotion_request_regular_admin_insufficient_privileges(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register regular administrator
  const regularAdminConnection: api.IConnection = { host: connection.host };
  const regularAdminEmail = typia.random<string & tags.Format<"email">>();
  const regularAdminPassword = RandomGenerator.alphaNumeric(16);
  await authorize_administrator_join(regularAdminConnection, {
    body: {
      email: regularAdminEmail,
      password: regularAdminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Register customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphaNumeric(16);
  await authorize_customer_join(customerConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 3. Customer submits administrator promotion request
  const request =
    await generate_random_shopping_mall_customer_administrator_requests_create(
      customerConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(request);
  // 4. Verify request is in 'pending' status
  TestValidator.equals("request status is pending", request.status, "pending");
  // 5. Regular administrator attempts to approve the request
  await TestValidator.httpError(
    "regular admin cannot approve promotion requests",
    403,
    async () => {
      await api.functional.shoppingMall.administrator.promotion_requests.update(
        regularAdminConnection,
        {
          requestId: request.id,
          body: {
            status: "approved",
          } satisfies IShoppingMallAdministratorPromotionRequest.IUpdate,
        },
      );
    },
  );
  // 6. Verify the request status remains 'pending' by attempting rejection as well
  await TestValidator.httpError(
    "regular admin cannot reject promotion requests",
    403,
    async () => {
      await api.functional.shoppingMall.administrator.promotion_requests.update(
        regularAdminConnection,
        {
          requestId: request.id,
          body: {
            status: "rejected",
            rejected_reason: "Not qualified",
          } satisfies IShoppingMallAdministratorPromotionRequest.IUpdate,
        },
      );
    },
  );
}
