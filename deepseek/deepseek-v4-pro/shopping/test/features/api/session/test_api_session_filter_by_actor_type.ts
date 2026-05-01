import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallGuestSession";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test session filtering by actor type discriminator.
 *
 * Validates that the session browsing endpoint correctly filters sessions by the `actorType` discriminator. A customer authenticates via registration to create a customer session record, then queries the session API with `actorType: "customer"` to retrieve only customer-type sessions.
 *
 * The test verifies two critical invariants: first, that every session in the filtered result set has `actorType` strictly equal to `"customer"` with no sessions from other actor types (seller, admin, guest) leaking into the results. Second, that pagination metadata remains accurate and consistent when filters are applied — the records count must reflect only the filtered subset and be at least as large as the returned data array.
 *
 * 1. Authenticate a new customer via `authorize_customer_join` to establish a customer session.
 * 2. Query sessions with `actorType: "customer"` filter applied.
 * 3. Assert every returned session record has `actorType` equal to `"customer"`.
 * 4. Validate pagination metadata exists and is internally consistent.
 */
export async function test_api_session_filter_by_actor_type(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  const result = await api.functional.shoppingMall.customer.sessions.index(
    customerConnection,
    {
      body: {
        actorType: "customer",
      } satisfies IShoppingMallGuestSession.IRequest,
    },
  );
  typia.assert(result);
  for (const session of result.data) {
    TestValidator.equals(
      "session actor type is customer",
      session.actorType,
      "customer" as const,
    );
  }
  TestValidator.predicate(
    "at least one customer session exists",
    result.data.length >= 1,
  );
  TestValidator.predicate(
    "pagination records covers data length",
    result.pagination.records >= result.data.length,
  );
  TestValidator.equals(
    "current page defaults to 1",
    result.pagination.current,
    1 satisfies number as number,
  );
}
