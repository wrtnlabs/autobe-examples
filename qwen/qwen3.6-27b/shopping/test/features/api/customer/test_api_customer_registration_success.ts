import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomer";
import type { IEcommercePlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_registration_success(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test successful customer registration and authentication flow.
   *
   * Validates that a new customer can register with email, password, and session
   * context information. Verifies that the system creates the customer identity,
   * initializes the linked profile, and returns valid JWT authorization tokens.
   *
   * Tests email uniqueness constraint by using a random email that does not
   * exist in the system. Confirms the response includes the registered email,
   * unbanned status, and proper token structure with expiration metadata.
   *
   * 1. Generate unique email address for registration.
   * 2. Create customer account using authorize_customer_join utility.
   * 3. Assert complete IAuthorized response structure with typia.
   * 4. Validate email matches the registration input.
   * 5. Verify customer is not banned (is_banned = false).
   * 6. Confirm JWT tokens (access, refresh) and expiration metadata exist.
   * 7. Optional: Validate customer_profile is initialized if present.
   */
  // Create actor-specific connection
  const customerConnection: api.IConnection = { host: connection.host };
  // Generate unique email for registration
  const email = typia.random<string & tags.Format<"email">>();
  // Register customer using utility function
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email,
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommercePlatformCustomer.IJoin,
  });
  // Validate response structure
  typia.assert(authorized);
  // Validate business logic - email matches input
  TestValidator.equals("registered email matches", authorized.email, email);
  // Validate customer is unbanned on registration
  TestValidator.equals("customer is not banned", authorized.is_banned, false);
  // Validate authorization token structure
  TestValidator.predicate(
    "access token exists",
    authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    authorized.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "access token expiration exists",
    authorized.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "refresh deadline exists",
    authorized.token.refreshable_until.length > 0,
  );
  // Validate timestamps exist
  TestValidator.predicate(
    "created_at exists",
    authorized.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at exists",
    authorized.updated_at.length > 0,
  );
  // Optional: if customer_profile is initialized, validate its structure
  if (
    authorized.customer_profile !== null &&
    authorized.customer_profile !== undefined
  ) {
    const profile = authorized.customer_profile;
    TestValidator.equals(
      "profile email matches customer",
      profile.customer.email,
      email,
    );
    TestValidator.equals("profile not deleted", profile.deleted_at, null);
  }
}
