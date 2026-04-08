import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Verify that customer profile updates are scoped to the authenticated account only.
 *
 * This test confirms that the customer profile update endpoint resolves its target
 * from the signed-in customer session rather than from any externally supplied account
 * identifier. It also verifies that the response belongs to the same authenticated
 * customer and that only editable profile fields are changed by the operation.
 *
 * 1. Register a customer and establish an authenticated customer session.
 * 2. Update the profile through that session using new display name and phone number values.
 * 3. Validate the returned profile is owned by the authenticated customer and reflects the requested changes.
 */
export async function test_api_customer_profile_update_own_account_only(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
      ip: "127.0.0.1",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(authorized);
  const displayName = RandomGenerator.name();
  const phoneNumber = RandomGenerator.mobile();
  const profile = await api.functional.mallPlatform.customer.profile.update(
    customerConnection,
    {
      body: {
        displayName,
        phoneNumber,
      } satisfies IMallPlatformCustomerProfile.IUpdate,
    },
  );
  typia.assert(profile);
  TestValidator.equals(
    "profile belongs to authenticated customer",
    profile.customer.id,
    authorized.id,
  );
  TestValidator.equals(
    "profile email belongs to authenticated customer",
    profile.customer.email,
    authorized.email,
  );
  TestValidator.equals(
    "display name is updated on the authenticated customer's own profile",
    profile.displayName,
    displayName,
  );
  TestValidator.equals(
    "phone number is updated on the authenticated customer's own profile",
    profile.phoneNumber,
    phoneNumber,
  );
  TestValidator.equals(
    "customer account status remains unchanged",
    profile.customer.status,
    authorized.status,
  );
  TestValidator.equals(
    "customer account creation timestamp remains unchanged",
    profile.customer.created_at,
    authorized.created_at,
  );
  TestValidator.equals(
    "customer account deletion timestamp remains unchanged",
    profile.customer.deleted_at,
    authorized.deleted_at,
  );
}
