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

/**
 * Test filtering customer sessions to show only active (non-expired) sessions.
 *
 * Validates the session filtering functionality by registering a customer,
 * authenticating to establish a login session, and sending a PATCH request
 * with showExpired=false to filter out expired sessions. Verifies that the
 * response only contains sessions where expired_at is in the future and
 * that pagination metadata accurately reflects the filtered dataset.
 *
 * This test ensures the showExpired=false parameter correctly filters the
 * session list to include only active sessions, excluding any that have
 * already expired based on their expired_at timestamp.
 *
 * 1. Register a new customer account with randomized credentials.
 * 2. Authenticate to create a login session.
 * 3. Send PATCH request with showExpired=false to filter active sessions.
 * 4. Validate all returned sessions have future expiration timestamps.
 * 5. Verify pagination metadata structure and values.
 */
export async function test_api_customer_session_filter_active_only(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new customer to create a login session
  const customerAuth = await authorize_customer_join(connection, {});
  // 2. Create customer-specific connection with authorization token
  const customerConnection: api.IConnection = {
    host: connection.host,
  };
  customerConnection.headers = {
    Authorization: `Bearer ${customerAuth.token.access}`,
  };
  // 3. Send PATCH request with showExpired=false to filter active sessions
  const response =
    await api.functional.ecommerceMall.customer.customer.sessions.index(
      customerConnection,
      {
        body: {
          showExpired: false,
        },
      },
    );
  // 4. Validate response structure using typia.assert()
  typia.assert(response);
  // 5. Validate all returned sessions have future expiration timestamps
  const now = new Date();
  for (const session of response.data) {
    const expiredAt = new Date(session.expired_at);
    TestValidator.predicate(
      "session expired_at is in the future",
      expiredAt.getTime() > now.getTime(),
    );
  }
  // 6. Validate pagination metadata structure
  TestValidator.predicate(
    "pagination exists",
    response.pagination !== undefined && response.pagination !== null,
  );
  TestValidator.equals(
    "pagination current page is valid",
    response.pagination.current >= 0,
    true,
  );
  TestValidator.equals(
    "pagination limit is valid",
    response.pagination.limit >= 0,
    true,
  );
  TestValidator.equals(
    "pagination records is valid",
    response.pagination.records >= 0,
    true,
  );
  TestValidator.equals(
    "pagination pages is valid",
    response.pagination.pages >= 0,
    true,
  );
}
