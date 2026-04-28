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
 * Validates ownership mismatch error when retrieving a customer profile with mismatched customer and profile IDs.
 *
 * Tests the business rule that customer profiles must belong to the specified customer account. When an administrator attempts to retrieve a profile using a customerId that does not match the profile's actual owner, the system must reject the request with 404 Not Found.
 *
 * This scenario creates two separate customer accounts, each with their own associated profile, then deliberately mixes the IDs to trigger the ownership validation check.
 *
 * 1. Administrator authenticates via join endpoint.
 * 2. First customer account is created, which also initializes their profile.
 * 3. Second customer account is created, which also initializes their profile.
 * 4. Admin attempts to retrieve the second customer's profile using the first customer's ID.
 * 5. System returns 404 Not Found, confirming ownership validation is enforced.
 */
export async function test_api_customer_profile_ownership_mismatch(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {});
  typia.assert(adminAuth);
  // 2. Create first customer account
  const customer1Connection: api.IConnection = { host: connection.host };
  const customer1Auth = await authorize_customer_join(customer1Connection, {});
  typia.assert(customer1Auth);
  const customer1Id: string & tags.Format<"uuid"> = customer1Auth.id;
  const profile1: IEcommercePlatformCustomerProfile | null | undefined =
    customer1Auth.customer_profile;
  typia.assertGuard(profile1!);
  // 3. Create second customer account
  const customer2Connection: api.IConnection = { host: connection.host };
  const customer2Auth = await authorize_customer_join(customer2Connection, {});
  typia.assert(customer2Auth);
  const profile2: IEcommercePlatformCustomerProfile | null | undefined =
    customer2Auth.customer_profile;
  typia.assertGuard(profile2!);
  // 4. Validate that customer IDs and profile IDs are all different
  TestValidator.notEquals(
    "Customer IDs must differ",
    customer1Id,
    customer2Auth.id,
  );
  TestValidator.notEquals("Profile IDs must differ", profile1.id, profile2.id);
  // 5. Attempt to retrieve profile2 using customer1's ID (ownership mismatch)
  await TestValidator.httpError(
    "ownership mismatch returns 404",
    404,
    async () =>
      await api.functional.ecommercePlatform.admin.customers.profiles.at(
        adminConnection,
        {
          customerId: customer1Id,
          profileId: profile2.id,
        },
      ),
  );
}
