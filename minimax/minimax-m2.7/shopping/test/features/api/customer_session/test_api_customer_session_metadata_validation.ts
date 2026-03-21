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
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_session_metadata_validation(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new customer
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const href = "https://example.com/register" satisfies string &
    tags.Format<"uri">;
  const referrer = "https://google.com" satisfies string & tags.Format<"uri">;
  const joinConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(joinConnection, {
    body: {
      email,
      password,
      href,
      referrer,
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(authorized);
  // Step 2: Login to capture session details
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResponse = await authorize_customer_login(loginConnection, {
    body: {
      email,
      password,
      href: "https://example.com/login" satisfies string & tags.Format<"uri">,
      referrer: href,
    } satisfies IEcommerceMallCustomer.ILogin,
  });
  typia.assert(loginResponse);
  // Extract session ID from the authorization token
  const sessionId = authorized.id;
  // Step 3: Retrieve the session metadata using GET /ecommerceMall/customer/sessions/{sessionId}
  const customerConnection: api.IConnection = { host: connection.host };
  customerConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  const session = await api.functional.ecommerceMall.customer.sessions.at(
    customerConnection,
    {
      sessionId: sessionId,
    },
  );
  typia.assert(session);
  // Step 4: Validate session metadata fields for security auditing
  // Validate IP address format (must be valid IPv4)
  TestValidator.predicate(
    "ip is valid IPv4 format",
    /^(\d{1,3}\.){3}\d{1,3}$/.test(session.ip),
  );
  // Validate href is valid URI starting with http:// or https://
  TestValidator.predicate(
    "href is valid URI",
    session.href.startsWith("http://") || session.href.startsWith("https://"),
  );
  // Validate referrer is valid URI (can be empty or valid URI)
  TestValidator.predicate(
    "referrer is valid URI or empty",
    session.referrer === "" ||
      session.referrer.startsWith("http://") ||
      session.referrer.startsWith("https://"),
  );
  // Parse timestamps for comparison
  const createdAt = new Date(session.created_at);
  const updatedAt = new Date(session.updated_at);
  const expiredAt = new Date(session.expired_at);
  const now = new Date();
  // Validate created_at is recent (within last 5 minutes to account for test execution time)
  const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
  TestValidator.predicate(
    "created_at is recent (within last 5 minutes)",
    createdAt >= fiveMinutesAgo && createdAt <= now,
  );
  // Validate updated_at >= created_at
  TestValidator.predicate(
    "updated_at >= created_at",
    updatedAt.getTime() >= createdAt.getTime(),
  );
  // Validate expired_at > created_at (session should expire in the future)
  TestValidator.predicate("expired_at is in the future", expiredAt > now);
  // Validate expired_at >= updated_at
  TestValidator.predicate(
    "expired_at >= updated_at",
    expiredAt.getTime() >= updatedAt.getTime(),
  );
  // Validate access_token is non-empty JWT string
  TestValidator.predicate(
    "access_token is non-empty string",
    typeof session.access_token === "string" && session.access_token.length > 0,
  );
  // Validate refresh_token is non-empty JWT string
  TestValidator.predicate(
    "refresh_token is non-empty string",
    typeof session.refresh_token === "string" &&
      session.refresh_token.length > 0,
  );
  // Validate JWT token format (should have 3 parts separated by dots)
  const jwtParts = session.access_token.split(".");
  TestValidator.equals(
    "access_token has valid JWT format (3 parts)",
    jwtParts.length,
    3,
  );
  // Validate refresh_token has valid JWT format
  const refreshJwtParts = session.refresh_token.split(".");
  TestValidator.equals(
    "refresh_token has valid JWT format (3 parts)",
    refreshJwtParts.length,
    3,
  );
  // Validate customer relationship exists
  TestValidator.predicate(
    "session has customer relationship",
    session.customer !== null && session.customer !== undefined,
  );
  // Validate session ID matches requested
  TestValidator.equals("session ID matches requested", session.id, sessionId);
}
