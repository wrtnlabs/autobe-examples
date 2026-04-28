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
 * Test administrator update of customer display name via admin profile endpoint.
 *
 * Validates that an administrator can modify a customer's display name through the admin-focused profile update API. The system ensures the customer exists, is active (not soft-deleted), and is not banned before applying the profile change.
 *
 * An immutable snapshot is automatically created by the system to capture the previous and current display name values, providing an audit trail for profile modifications.
 *
 * 1. Administrator registers and authenticates to gain admin privileges.
 * 2. Customer registers, creating their account and initial profile.
 * 3. Administrator updates the customer's display name to a new value.
 * 4. Validate returned profile displays the updated name and references the correct customer.
 */
export async function test_api_customer_profile_admin_update_display_name(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Customer registration
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: { email: customerEmail },
  });
  typia.assert(customerAuth);
  const customerId = customerAuth.id;
  // 3. Administrator updates customer's display name
  const newDisplayName = RandomGenerator.name();
  const body = {
    display_name: newDisplayName,
  } satisfies IEcommercePlatformCustomerProfile.IUpdate;
  const updatedProfile =
    await api.functional.ecommercePlatform.admin.customers.profiles.update(
      adminConnection,
      {
        customerId,
        body,
      },
    );
  typia.assert(updatedProfile);
  // 4. Validate the updated profile
  TestValidator.equals(
    "display name matches the new value",
    updatedProfile.display_name,
    newDisplayName,
  );
  TestValidator.equals(
    "profile references the correct customer",
    updatedProfile.customer.id,
    customerId,
  );
  TestValidator.equals(
    "profile customer email matches",
    updatedProfile.customer.email,
    customerEmail,
  );
}
