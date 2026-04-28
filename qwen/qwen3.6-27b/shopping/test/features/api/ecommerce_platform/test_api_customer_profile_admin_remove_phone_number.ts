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
 * Test administrator removes a customer's phone number by setting it to null.
 *
 * Validates the administrator authorization flow, customer registration, and the profile update operation where the phone number is removed. The system ensures the customer record exists, is not soft-deleted, and is not banned. The admin performs the update, setting the phone number field to null while ensuring other profile fields like display name remain valid. The updated profile snapshot captures the change, and the response confirms the phone number deletion.
 *
 * 1. Administrator registers with email, password, and session context.
 * 2. Customer registers with email, password, and session context.
 * 3. Administrator updates the customer's profile, setting the phone number to null.
 * 4. Validates the updated profile has a null phone number.
 */
export async function test_api_customer_profile_admin_remove_phone_number(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      ip: undefined,
      password: RandomGenerator.alphaNumeric(16),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies DeepPartial<IEcommercePlatformAdmin.IJoin>,
  });
  // 2. Customer setup
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      ip: undefined,
      password: RandomGenerator.alphaNumeric(16),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies DeepPartial<IEcommercePlatformCustomer.IJoin>,
  });
  typia.assert(customerAuth);
  // 3. Admin updates customer profile to remove phone number
  const updatedProfile =
    await api.functional.ecommercePlatform.admin.customers.profiles.update(
      adminConnection,
      {
        customerId: customerAuth.id,
        body: {
          display_name: RandomGenerator.name(),
          phone_number: null,
        } satisfies IEcommercePlatformCustomerProfile.IUpdate,
      },
    );
  typia.assert(updatedProfile);
  // 4. Validate phone number is null
  TestValidator.equals(
    "phone_number is null",
    updatedProfile.phone_number,
    null,
  );
}
