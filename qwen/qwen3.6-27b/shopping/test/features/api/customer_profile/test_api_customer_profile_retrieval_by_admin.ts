import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformAdmin";
import type { IEcommercePlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomer";
import type { IEcommercePlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test admin retrieval of a customer profile by customer ID and profile ID.
 *
 * Validates that an administrator can successfully retrieve a customer profile using the admin endpoint with both the customer ID and profile ID as path parameters. The test ensures the complete workflow including admin registration, customer registration (which auto-creates a profile), and profile retrieval.
 *
 * Verifies that the returned profile entity contains all expected fields: id, display_name (non-empty), phone_number (nullable), customer summary reference, created_at, updated_at, and deleted_at (null for active profiles).
 *
 * 1. Administrator registers and authenticates via admin join utility.
 * 2. Customer registers via customer join utility, which auto-creates an associated profile.
 * 3. Extracts customer ID and profile ID from the registration response.
 * 4. Administrator retrieves the customer profile using the target GET endpoint.
 * 5. Validates response structure, customer summary reference matching, and active profile state.
 */
export async function test_api_customer_profile_retrieval_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - register and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Customer setup - register which auto-creates profile
  const customerConnection: api.IConnection = { host: connection.host };
  const authorizedCustomer = await authorize_customer_join(
    customerConnection,
    {},
  );
  typia.assert(authorizedCustomer);
  // Extract profile from authorized response - must be non-null since join creates one
  typia.assertGuard(authorizedCustomer.customer_profile!);
  const customerProfile = authorizedCustomer.customer_profile;
  // 3. Admin retrieves customer profile
  const retrievedProfile =
    await api.functional.ecommercePlatform.admin.customers.profiles.at(
      adminConnection,
      {
        customerId: authorizedCustomer.id,
        profileId: customerProfile.id,
      },
    );
  typia.assert(retrievedProfile);
  // 4. Validate response
  TestValidator.equals(
    "profile ID matches",
    retrievedProfile.id,
    customerProfile.id,
  );
  TestValidator.equals(
    "customer ID matches",
    retrievedProfile.customer.id,
    authorizedCustomer.id,
  );
  TestValidator.predicate(
    "display name is non-empty",
    retrievedProfile.display_name.length > 0,
  );
  TestValidator.predicate(
    "active profile has null deleted_at",
    retrievedProfile.deleted_at === null,
  );
  TestValidator.equals(
    "customer email matches",
    retrievedProfile.customer.email,
    authorizedCustomer.email,
  );
  TestValidator.predicate(
    "created_at exists",
    retrievedProfile.created_at !== null,
  );
  TestValidator.predicate(
    "updated_at exists",
    retrievedProfile.updated_at !== null,
  );
}
