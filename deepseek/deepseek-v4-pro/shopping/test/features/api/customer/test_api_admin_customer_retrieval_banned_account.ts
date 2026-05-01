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
 * Test retrieval of banned customer account by administrator.
 *
 * Validates that when an administrator retrieves a banned customer's account
 * information through the admin customer retrieval endpoint, the response
 * correctly reflects the ban status while preserving the customer's profile
 * data intact. The test verifies the integrity of customer records after
 * administrative enforcement actions.
 *
 * Banning a customer sets banned_at to the current timestamp and prevents
 * future logins, but does not modify profile fields or constitute account
 * deletion. This test confirms that the API response accurately reflects
 * this distinction.
 *
 * 1. Administrator registers and authenticates using admin join utility.
 * 2. Customer registers and authenticates using customer join utility.
 * 3. Administrator bans the customer account via the ban endpoint.
 * 4. Administrator retrieves the banned customer by customer ID.
 * 5. Validates banned_at is a non-null ISO datetime indicating the ban.
 * 6. Validates profile fields (email, display_name, phone_number) remain intact.
 * 7. Validates deleted_at is null since banning is distinct from deletion.
 */
export async function test_api_admin_customer_retrieval_banned_account(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator registration and authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Customer registration and authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {});
  // 3. Administrator bans the customer
  const bannedCustomer = await api.functional.shoppingMall.admin.customers.ban(
    adminConnection,
    {
      customerId: customer.id,
    },
  );
  typia.assert(bannedCustomer);
  // 4. Administrator retrieves the banned customer by ID
  const retrievedCustomer =
    await api.functional.shoppingMall.admin.customers.at(adminConnection, {
      customerId: customer.id,
    });
  typia.assert(retrievedCustomer);
  // 5. Validate ban status and profile integrity
  TestValidator.predicate(
    "banned_at is populated with non-null ISO datetime",
    retrievedCustomer.banned_at !== null,
  );
  TestValidator.equals(
    "email preserved after ban",
    retrievedCustomer.email,
    customer.email,
  );
  TestValidator.equals(
    "display_name preserved after ban",
    retrievedCustomer.display_name,
    customer.display_name,
  );
  TestValidator.equals(
    "phone_number preserved after ban",
    retrievedCustomer.phone_number,
    customer.phone_number,
  );
  TestValidator.equals(
    "deleted_at remains null (banning is distinct from deletion)",
    retrievedCustomer.deleted_at,
    null,
  );
}
