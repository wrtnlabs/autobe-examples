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
 * Test administrator updates both display name and phone number for an active customer's profile.
 *
 * Validates that an administrator can atomically update both the display_name and phone_number fields
 * of a customer's profile in a single PUT request. The system ensures the customer exists, is not
 * soft-deleted, and is not banned before applying the update. An immutable snapshot captures the
 * before and after state of both changed fields for audit purposes.
 *
 * The test registers a customer account, authenticates as an administrator, performs the profile
 * update with both fields, and validates the returned profile reflects the new values while
 * maintaining profile integrity.
 *
 * 1. Register a customer account to create a profile.
 * 2. Authenticate an administrator account.
 * 3. Admin updates the customer's profile with new display_name and phone_number.
 * 4. Validate the updated profile contains the new values and maintains proper structure.
 */
export async function test_api_customer_profile_admin_update_display_and_phone(
  connection: api.IConnection,
) {
  // 1. Register a customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuthorized: IEcommercePlatformCustomer.IAuthorized =
    await authorize_customer_join(customerConnection, { body: undefined });
  typia.assert(customerAuthorized);
  // 2. Authenticate administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommercePlatformAdmin.ILogin,
  });
  // 3. Admin updates customer profile with both display_name and phone_number
  const newDisplayName = RandomGenerator.paragraph({ sentences: 1 });
  const newPhoneNumber = RandomGenerator.mobile();
  const updatedProfile: IEcommercePlatformCustomerProfile =
    await api.functional.ecommercePlatform.admin.customers.profiles.update(
      adminConnection,
      {
        customerId: customerAuthorized.id,
        body: {
          display_name: newDisplayName,
          phone_number: newPhoneNumber,
        } satisfies IEcommercePlatformCustomerProfile.IUpdate,
      },
    );
  typia.assert(updatedProfile);
  // 4. Validate the updated profile contains the new values
  TestValidator.equals(
    "display_name matches input",
    updatedProfile.display_name,
    newDisplayName,
  );
  TestValidator.equals(
    "phone_number matches input",
    updatedProfile.phone_number,
    newPhoneNumber,
  );
  TestValidator.equals(
    "customer reference id matches",
    updatedProfile.customer.id,
    customerAuthorized.id,
  );
}
