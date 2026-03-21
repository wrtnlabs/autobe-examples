import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerSession";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import type { IEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlistItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCustomerSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test session filtering by actor type across all platform user types.
 *
 * Scenario:
 * 1. Authenticate as customer to obtain JWT tokens for session listing
 * 2. Query sessions without actorType filter to retrieve sessions from all tables
 * 3. Verify the response includes sessions
 * 4. Apply status='expired' filter to retrieve only expired sessions
 * 5. Verify that expired sessions have expired_at <= current server time
 */
export async function test_api_customer_session_cross_actor_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as customer to create a session
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {});
  typia.assert(authorized);
  // Step 2: Query sessions without actorType filter to retrieve sessions from all tables
  const allSessions =
    await api.functional.ecommerceMall.customer.sessions.index(
      customerConnection,
      {
        body: {
          limit: 20,
        } satisfies IEcommerceMallCustomerSession.IRequest,
      },
    );
  typia.assert(allSessions);
  // Verify pagination structure
  TestValidator.equals("has pagination", allSessions.pagination !== null, true);
  TestValidator.equals("has data array", Array.isArray(allSessions.data), true);
  // Step 3: Verify the response includes sessions (at least the one we just created)
  TestValidator.predicate(
    "has at least one session",
    allSessions.data.length > 0,
  );
  // Step 4: Apply status='expired' filter to retrieve only expired sessions
  const expiredSessions =
    await api.functional.ecommerceMall.customer.sessions.index(
      customerConnection,
      {
        body: {
          status: "expired",
          limit: 20,
        } satisfies IEcommerceMallCustomerSession.IRequest,
      },
    );
  typia.assert(expiredSessions);
  // Step 5: Verify that expired sessions have expired_at <= current server time
  const currentTime = new Date();
  for (const session of expiredSessions.data) {
    const expiredAt = new Date(session.expired_at);
    TestValidator.predicate(
      `session ${session.id} expired_at (${session.expired_at}) <= current time (${currentTime.toISOString()})`,
      expiredAt <= currentTime,
    );
  }
  // Also verify that if there are expired sessions, they all have valid structure
  TestValidator.equals(
    "expired sessions pagination exists",
    expiredSessions.pagination !== null,
    true,
  );
  TestValidator.equals(
    "expired sessions data is array",
    Array.isArray(expiredSessions.data),
    true,
  );
}
