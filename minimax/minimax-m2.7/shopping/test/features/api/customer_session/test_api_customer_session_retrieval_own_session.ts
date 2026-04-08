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
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test that an authenticated customer can retrieve their own session metadata.
 *
 * Validates the session retrieval endpoint returns correct session information including
 * session identifier, customer reference, device context (IP, URL, referrer), and lifecycle
 * timestamps. Ensures security by verifying that sensitive token data (access_token, refresh_token)
 * is not exposed in the response.
 *
 * 1. Register new customer via join endpoint to create authenticated session.
 * 2. Extract session ID from JWT token in authorization response.
 * 3. Retrieve session via GET /ecommerceMall/customer/customer/sessions/{sessionId}.
 * 4. Validate response structure matches IEcommerceMallCustomerSession schema.
 * 5. Verify session belongs to the authenticated customer.
 * 6. Confirm access_token and refresh_token are excluded from response.
 */
export async function test_api_customer_session_retrieval_own_session(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new customer to create authenticated session
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {});
  // 2. Extract session ID from JWT access token payload
  // The session ID may be stored in the JWT as 'sid', 'session_id', or 'jti' claim
  const tokenParts = authorized.token.access.split(".");
  const tokenPayload = JSON.parse(atob(tokenParts[1]));
  const sessionId = (tokenPayload.sid ??
    tokenPayload.session_id ??
    tokenPayload.jti) as string;
  // 3. Retrieve session metadata using the extracted session ID
  const session =
    await api.functional.ecommerceMall.customer.customer.sessions.at(
      customerConnection,
      {
        sessionId: sessionId,
      },
    );
  // 4. Validate response structure with typia.assert()
  typia.assert(session);
  // 5. Verify session belongs to authenticated customer
  TestValidator.equals(
    "session customer id matches",
    session.customer.id,
    authorized.id,
  );
  TestValidator.equals(
    "customer email matches",
    session.customer.email,
    authorized.email,
  );
  TestValidator.equals(
    "customer status is active",
    session.customer.status,
    "active",
  );
  // 6. Verify required session fields are present
  TestValidator.predicate("session has valid id", session.id.length > 0);
  TestValidator.predicate(
    "session has valid ip",
    /^\d+\.\d+\.\d+\.\d+$/.test(session.ip),
  );
  TestValidator.predicate("session has valid href", session.href.length > 0);
  TestValidator.predicate(
    "session has valid referrer",
    session.referrer.length > 0,
  );
  TestValidator.predicate(
    "session has created_at timestamp",
    session.created_at.length > 0,
  );
  TestValidator.predicate(
    "session has updated_at timestamp",
    session.updated_at.length > 0,
  );
  TestValidator.predicate(
    "session has expired_at timestamp",
    session.expired_at.length > 0,
  );
  // 7. Verify customer profile is included
  TestValidator.predicate(
    "customer has profile",
    session.customer.profile !== undefined,
  );
  TestValidator.equals(
    "profile display name matches",
    session.customer.profile.display_name,
    authorized.profile.display_name,
  );
  // 8. Security check - ensure access_token and refresh_token are NOT in response
  // The response should NOT contain these sensitive fields for security
  const sessionRecord = session as unknown as Record<string, unknown>;
  TestValidator.equals(
    "session does not expose access_token",
    sessionRecord.access_token,
    undefined,
  );
  TestValidator.equals(
    "session does not expose refresh_token",
    sessionRecord.refresh_token,
    undefined,
  );
  TestValidator.equals(
    "session does not expose token field",
    sessionRecord.token,
    undefined,
  );
}
