import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomerSession";
import type { IShoppingMallActor } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallActor";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test listing authentication sessions across all actor types.
 *
 * This test verifies the sessions list endpoint returns a properly structured
 * paginated response containing sessions from all actor types (customer, seller,
 * administrator) with correct sorting and default pagination.
 */
export async function test_api_customer_sessions_list_all_actors(
  connection: api.IConnection,
): Promise<void> {
  // Create customer-specific connection
  const customerConnection: api.IConnection = { host: connection.host };
  // Authenticate as customer using utility function
  const customer = await authorize_customer_join(customerConnection, {});
  typia.assert(customer);
  // Request sessions list without filters (empty request body)
  const response = await api.functional.shoppingMall.customer.sessions.index(
    customerConnection,
    {
      body: {} satisfies IShoppingMallCustomerSession.IRequest,
    },
  );
  typia.assert(response);
  // Verify pagination default values
  TestValidator.equals("default current page", response.pagination.current, 1);
  TestValidator.equals("default limit", response.pagination.limit, 20);
  // Verify pagination calculation
  const expectedPages =
    Math.ceil(response.pagination.records / response.pagination.limit) || 0;
  TestValidator.equals(
    "pagination pages calculation",
    response.pagination.pages,
    expectedPages,
  );
  // Verify data count respects limit
  TestValidator.predicate(
    "data count within limit",
    response.data.length <= response.pagination.limit,
  );
  // Verify the newly created customer session appears in results
  const customerSession = response.data.find(
    (session) =>
      session.actor.type === "customer" && session.actor.id === customer.id,
  );
  TestValidator.predicate(
    "customer's session found in results",
    customerSession !== undefined,
  );
  // Verify customer session has correct actor_type discriminator
  if (customerSession !== undefined) {
    TestValidator.equals(
      "customer session actor_type",
      customerSession.actor_type,
      "customer",
    );
  }
  // Verify sessions are sorted by created_at descending (newest first)
  const createdDates = response.data.map((s) =>
    new Date(s.created_at).getTime(),
  );
  const isSortedDescending = createdDates.every(
    (date, i) => i === 0 || createdDates[i - 1] >= date,
  );
  TestValidator.predicate(
    "sessions sorted by created_at descending",
    isSortedDescending,
  );
  // Verify pagination structure correctness
  TestValidator.predicate(
    "total records non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages non-negative",
    response.pagination.pages >= 0,
  );
  // Verify actor_type values are valid across all sessions
  const validActorTypes = ["customer", "seller", "administrator"] as const;
  const allActorTypesValid = response.data.every((session) =>
    validActorTypes.includes(
      session.actor_type as (typeof validActorTypes)[number],
    ),
  );
  TestValidator.predicate(
    "all actor_type values are valid",
    allActorTypesValid,
  );
}
