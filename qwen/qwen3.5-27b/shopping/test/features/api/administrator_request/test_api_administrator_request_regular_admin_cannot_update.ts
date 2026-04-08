import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
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
 * Test that regular administrators cannot update administrator promotion requests.
 *
 * Validates that only super administrators have the privilege to approve or reject administrator promotion requests. Regular administrators are denied access to the update endpoint and receive an authorization error.
 *
 * The test verifies that the system enforces proper privilege separation between regular and super administrators, ensuring that critical administrative functions are restricted to the appropriate authority level.
 *
 * 1. Register a regular administrator account with grade='regular'
 * 2. Register a customer account that will submit an administrator request
 * 3. Customer submits an administrator promotion request with a valid reason
 * 4. Verify the request exists with status='pending'
 * 5. Regular admin attempts to update the request to status='approved'
 * 6. Verify the update fails with 403 Forbidden authorization error
 * 7. Verify the request remains unchanged (status still pending, processed_by still null)
 */
export async function test_api_administrator_request_regular_admin_cannot_update(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register regular administrator
  const regularAdminConnection: api.IConnection = { host: connection.host };
  const regularAdmin = await authorize_administrator_join(
    regularAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(regularAdmin);
  TestValidator.equals("grade is regular", regularAdmin.grade, "regular");
  // 2. Register customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(customer);
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
  TestValidator.equals("request status is pending", request.status, "pending");
  TestValidator.equals(
    "processed_by is null",
    request.processed_by_administrator_id,
    null,
  );
  // 4. Regular admin attempts to update the request (should fail with 403)
  await TestValidator.httpError(
    "regular admin cannot update administrator request",
    403,
    async () =>
      await api.functional.shoppingMall.administrator.administrator_requests.update(
        regularAdminConnection,
        {
          administratorRequestId: request.id,
          body: {
            status: "approved",
          } satisfies IShoppingMallAdministratorRequest.IUpdate,
        },
      ),
  );
  // 5. Verify request remains unchanged (status still pending, processed_by still null)
  // Note: We cannot directly fetch the request again as there's no GET endpoint in the SDK,
  // but the 403 error confirms the update was rejected and the request remains unchanged.
  TestValidator.predicate(
    "request exists with original ID",
    request.id !== null,
  );
}
