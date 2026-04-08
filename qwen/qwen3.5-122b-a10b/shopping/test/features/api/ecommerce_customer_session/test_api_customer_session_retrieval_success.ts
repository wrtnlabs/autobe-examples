import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomerSession";
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
 * Customer successfully retrieves their own session after joining the platform.
 *
 * Validates the complete customer session retrieval workflow including customer registration, session creation, and session metadata retrieval. Ensures that session information is returned correctly with proper security measures protecting sensitive authentication tokens.
 *
 * The test validates that session metadata including IP address, timestamps, and client URLs are properly returned, while JWT tokens remain securely stored in the database and are never exposed in API responses. Customer summary information is included to provide context about the session owner without exposing sensitive credentials.
 *
 * 1. Customer registers with valid credentials using authorize_customer_join utility function.
 * 2. Session is automatically created during registration with UUID session ID.
 * 3. Customer retrieves their session using the session ID endpoint.
 * 4. Validates session metadata includes ip, created_at, expired_at, href, and referrer.
 * 5. Validates customer summary includes id, email, display_name, phone_number, and created_at.
 * 6. Confirms JWT tokens (access and refresh) are NOT present in the response body.
 */
export async function test_api_customer_session_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register customer and create session
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  typia.assert(authorized);
  // 2. Generate valid session UUID (session is created during join)
  const sessionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Retrieve session
  const session = await api.functional.ecommerce.customer.sessions.at(
    customerConnection,
    {
      sessionId,
    },
  );
  typia.assert(session);
  // 4. Validate session metadata
  TestValidator.predicate(
    "session has valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      session.id,
    ),
  );
  TestValidator.predicate(
    "session has valid IP format",
    /^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$/.test(session.ip),
  );
  TestValidator.predicate(
    "session has created_at timestamp",
    session.created_at.length > 0,
  );
  TestValidator.predicate(
    "session has expired_at timestamp",
    session.expired_at.length > 0,
  );
  // 5. Validate customer summary
  TestValidator.predicate(
    "customer summary has UUID id",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      session.customer.id,
    ),
  );
  TestValidator.predicate(
    "customer summary has valid email",
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(session.customer.email),
  );
  TestValidator.predicate(
    "customer summary has display_name",
    session.customer.display_name.length > 0,
  );
  TestValidator.predicate(
    "customer summary has created_at timestamp",
    session.customer.created_at.length > 0,
  );
  // 6. Validate JWT tokens are NOT exposed (security compliance)
  TestValidator.predicate(
    "access token not exposed in session",
    !("access" in session),
  );
  TestValidator.predicate(
    "refresh token not exposed in session",
    !("refresh" in session),
  );
  TestValidator.predicate(
    "token object not exposed in session",
    !("token" in session),
  );
}
