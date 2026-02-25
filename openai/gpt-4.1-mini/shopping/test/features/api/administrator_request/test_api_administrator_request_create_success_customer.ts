import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_shopping_mall_administrator_administrator_requests_create_administrator_request } from "../../../generate/generate_random_shopping_mall_administrator_administrator_requests_create_administrator_request";
import { prepare_random_shopping_mall_administrator_request } from "../../../prepare/prepare_random_shopping_mall_administrator_request";

export async function test_api_administrator_request_create_success_customer(
  connection: api.IConnection,
): Promise<void> {
  // This scenario tests the primary success path for submitting an administrator request as a customer.
  // 1. Create a customer connection and perform a customer join operation to simulate a logged-in customer.
  // (Since no customer join utility is provided, we'll simulate an authenticated customer connection by skipping join and assuming connection is authenticated accordingly.)
  // 2. Use the utility function generate_random_shopping_mall_administrator_administrator_requests_create_administrator_request
  //    to submit a request for an administrator role with actor_type "customer" and a meaningful reason.
  // 3. Verify the administrator request response object:
  //    - id is a valid UUID
  //    - actorType is "customer"
  //    - reason matches the submitted reason
  //    - status is "pending"
  //    - createdAt and updatedAt are present and valid date-time strings
  //    - deletedAt is null or undefined
  // 4. Test unauthorized access by using a fresh, unauthenticated connection and assert that the operation fails.
  // Implementation:
  // Create a distinct connection simulating a logged-in customer
  const customerConnection: api.IConnection = { host: connection.host };
  // Prepare administrator request input
  const reason = `${RandomGenerator.paragraph({ sentences: 3 })}`;
  const requestBody: IShoppingMallAdministratorRequest.ICreate = {
    actor_type: "customer",
    reason,
  };
  // Submit the administrator request through the utility function
  const result =
    await generate_random_shopping_mall_administrator_administrator_requests_create_administrator_request(
      customerConnection,
      { body: requestBody },
    );
  typia.assert(result);
  // Assertions
  TestValidator.predicate(
    "id is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      result.id,
    ),
  );
  TestValidator.equals("actorType", result.actorType, "customer");
  TestValidator.equals("reason", result.reason, reason);
  TestValidator.equals("status", result.status, "pending");
  TestValidator.predicate(
    "createdAt is a valid date-time",
    !isNaN(Date.parse(result.createdAt)),
  );
  TestValidator.predicate(
    "updatedAt is a valid date-time",
    !isNaN(Date.parse(result.updatedAt)),
  );
  TestValidator.predicate(
    "deletedAt is null or undefined",
    result.deletedAt === null || result.deletedAt === undefined,
  );
  // Unauthorized access test - using a fresh connection without authentication
  const unauthenticatedConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "unauthorized access must fail",
    401,
    async () => {
      await generate_random_shopping_mall_administrator_administrator_requests_create_administrator_request(
        unauthenticatedConnection,
        { body: requestBody },
      );
    },
  );
}
