import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckout";
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
import type { IEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequestSnapshot";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import type { IEcommerceMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlist";
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

export async function test_api_customer_session_listing_with_date_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as a new customer
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {});
  typia.assert(authorized);
  // 2. Create additional login sessions by refreshing token multiple times
  await authorize_customer_refresh(customerConnection, {
    body: { refresh: authorized.token.refresh },
  });
  await authorize_customer_refresh(customerConnection, {
    body: { refresh: authorized.token.refresh },
  });
  // 3. Build date range for filtering (30 days ago to 1 day in future)
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const oneDayFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const createdAfter = thirtyDaysAgo.toISOString();
  const createdBefore = oneDayFromNow.toISOString();
  // 4. Query sessions with date range and showExpired filters
  const sessionsResponse =
    await api.functional.ecommerceMall.customer.customer.sessions.index(
      customerConnection,
      {
        body: {
          createdAfter: createdAfter,
          createdBefore: createdBefore,
          showExpired: true,
          page: 1,
          limit: 20,
        },
      },
    );
  typia.assert(sessionsResponse);
  // 5. Validate pagination metadata exists and is correct
  TestValidator.equals(
    "pagination metadata present",
    sessionsResponse.pagination !== undefined,
    true,
  );
  TestValidator.predicate(
    "current page is non-negative",
    sessionsResponse.pagination.current >= 0,
  );
  TestValidator.predicate(
    "limit is positive",
    sessionsResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "records is non-negative",
    sessionsResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages is non-negative",
    sessionsResponse.pagination.pages >= 0,
  );
  // 6. Validate data array exists
  TestValidator.equals(
    "sessions array exists",
    sessionsResponse.data !== undefined,
    true,
  );
  // 7. Validate session summaries if any exist
  if (sessionsResponse.data.length > 0) {
    const session = sessionsResponse.data[0];
    // Validate session has required fields
    TestValidator.equals("session has id", session.id !== undefined, true);
    TestValidator.equals("session has ip", session.ip !== undefined, true);
    TestValidator.equals("session has href", session.href !== undefined, true);
    TestValidator.equals(
      "session has referrer",
      session.referrer !== undefined,
      true,
    );
    TestValidator.equals(
      "session has customer summary",
      session.customer !== undefined,
      true,
    );
    TestValidator.equals(
      "session has created_at",
      session.created_at !== undefined,
      true,
    );
    TestValidator.equals(
      "session has expired_at",
      session.expired_at !== undefined,
      true,
    );
    // Validate customer summary has expected fields
    if (session.customer) {
      TestValidator.equals(
        "customer has id",
        session.customer.id !== undefined,
        true,
      );
      TestValidator.equals(
        "customer has email",
        session.customer.email !== undefined,
        true,
      );
      TestValidator.equals(
        "customer has status",
        session.customer.status !== undefined,
        true,
      );
    }
    // Validate timestamps are valid ISO date-time format
    TestValidator.predicate(
      "created_at is valid date",
      !isNaN(Date.parse(session.created_at)),
    );
    TestValidator.predicate(
      "expired_at is valid date",
      !isNaN(Date.parse(session.expired_at)),
    );
    // Validate expired_at is after created_at
    TestValidator.predicate(
      "expired_at after created_at",
      new Date(session.expired_at) > new Date(session.created_at),
    );
  }
  // 8. Validate date filtering - verify all sessions fall within range
  for (const session of sessionsResponse.data) {
    const createdAt = new Date(session.created_at);
    TestValidator.predicate(
      "session created_at >= createdAfter filter",
      createdAt >= thirtyDaysAgo,
    );
    TestValidator.predicate(
      "session created_at <= createdBefore filter",
      createdAt <= oneDayFromNow,
    );
  }
}
