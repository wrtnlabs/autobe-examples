import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
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
 * Test that an authenticated admin can retrieve any customer's profile for support and oversight purposes.
 *
 * This test validates the admin's ability to access customer profile information
 * for support and administrative oversight. The test creates both admin and customer
 * accounts, then verifies that the admin can successfully retrieve the customer's
 * complete profile including all public fields while ensuring sensitive data like
 * password_hash is excluded from the response.
 */
export async function test_api_customer_profile_retrieval_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "1234",
    },
  });
  typia.assert(adminAuth);
  // 2. Register a customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
    },
  });
  typia.assert(customerAuth);
  // 3. Admin retrieves the customer's profile using customer's ID
  const customerProfile: IShoppingMallCustomer =
    await api.functional.shoppingMall.customers.at(adminConnection, {
      customerId: customerAuth.id,
    });
  typia.assert(customerProfile);
  // 4. Validate response contains all expected fields
  TestValidator.equals(
    "customer ID matches",
    customerProfile.id,
    customerAuth.id,
  );
  TestValidator.equals(
    "email matches registration",
    customerProfile.email,
    customerAuth.email,
  );
  TestValidator.equals(
    "display name matches registration",
    customerProfile.display_name,
    customerAuth.display_name,
  );
  TestValidator.equals(
    "phone number matches registration",
    customerProfile.phone_number,
    customerAuth.phone_number,
  );
  TestValidator.equals("status is active", customerProfile.status, "active");
  TestValidator.equals(
    "deleted_at is null for active account",
    customerProfile.deleted_at,
    null,
  );
}
