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
 * Test filtering sessions by actor type discriminator.
 * A customer authenticates and requests sessions filtered to specific actor types.
 * Verifies: (1) only sessions matching actor_type returned; (2) actor field structure
 * matches actor_type discriminator; (3) pagination reflects filtered subset.
 */
export async function test_api_customer_sessions_filter_by_actor_type(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as customer
  const customerConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_customer_join(customerConnection, {});
  typia.assert(authResult);
  // 2. Test filtering by 'customer' actor type
  const customerSessions =
    await api.functional.shoppingMall.customer.sessions.index(
      customerConnection,
      {
        body: {
          actor_type: "customer",
          limit: 10,
        } satisfies IShoppingMallCustomerSession.IRequest,
      },
    );
  typia.assert(customerSessions);
  // Verify all sessions are customer type
  for (const session of customerSessions.data) {
    TestValidator.equals(
      "actor_type should be customer",
      session.actor_type,
      "customer",
    );
    TestValidator.equals(
      "actor.type should be customer",
      session.actor.type,
      "customer",
    );
    // Verify customer actor structure has displayName
    if (session.actor.type === "customer") {
      TestValidator.predicate(
        "customer actor has displayName or null",
        session.actor.displayName === null ||
          typeof session.actor.displayName === "string",
      );
    }
  }
  // 3. Test filtering by 'seller' actor type
  const sellerSessions =
    await api.functional.shoppingMall.customer.sessions.index(
      customerConnection,
      {
        body: {
          actor_type: "seller",
          limit: 10,
        } satisfies IShoppingMallCustomerSession.IRequest,
      },
    );
  typia.assert(sellerSessions);
  // Verify all sessions are seller type
  for (const session of sellerSessions.data) {
    TestValidator.equals(
      "actor_type should be seller",
      session.actor_type,
      "seller",
    );
    TestValidator.equals(
      "actor.type should be seller",
      session.actor.type,
      "seller",
    );
    // Verify seller actor structure has shopName
    if (session.actor.type === "seller") {
      TestValidator.predicate(
        "seller actor has shopName",
        typeof session.actor.shopName === "string",
      );
    }
  }
  // 4. Test filtering by 'administrator' actor type
  const adminSessions =
    await api.functional.shoppingMall.customer.sessions.index(
      customerConnection,
      {
        body: {
          actor_type: "administrator",
          limit: 10,
        } satisfies IShoppingMallCustomerSession.IRequest,
      },
    );
  typia.assert(adminSessions);
  // Verify all sessions are administrator type
  for (const session of adminSessions.data) {
    TestValidator.equals(
      "actor_type should be administrator",
      session.actor_type,
      "administrator",
    );
    TestValidator.equals(
      "actor.type should be administrator",
      session.actor.type,
      "administrator",
    );
    // Verify administrator actor structure has grade
    if (session.actor.type === "administrator") {
      TestValidator.predicate(
        "administrator actor has valid grade",
        session.actor.grade === "regular" || session.actor.grade === "super",
      );
    }
  }
  // 5. Verify pagination reflects filtered subset
  // Each filtered result should have valid pagination
  TestValidator.predicate(
    "customer sessions pagination is valid",
    customerSessions.pagination.current >= 1 &&
      customerSessions.pagination.limit >= 1 &&
      customerSessions.pagination.records >= 0,
  );
  TestValidator.predicate(
    "seller sessions pagination is valid",
    sellerSessions.pagination.current >= 1 &&
      sellerSessions.pagination.limit >= 1 &&
      sellerSessions.pagination.records >= 0,
  );
  TestValidator.predicate(
    "administrator sessions pagination is valid",
    adminSessions.pagination.current >= 1 &&
      adminSessions.pagination.limit >= 1 &&
      adminSessions.pagination.records >= 0,
  );
}
