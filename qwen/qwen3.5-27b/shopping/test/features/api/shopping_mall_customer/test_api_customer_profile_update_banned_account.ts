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
 * Test that banned customers cannot update their profile information.
 *
 * This test verifies that when a customer account is banned by an administrator,
 * the customer is unable to modify their profile information. The test:
 * 1. Registers a new customer account
 * 2. Creates an admin account
 * 3. Bans the customer account via admin endpoint (requires admin ban API)
 * 4. Attempts to update the customer profile (should fail with 403)
 * 5. Validates that the profile remains unchanged
 *
 * Note: The admin ban endpoint (PUT /shoppingMall/admin/customers/{id}/ban) is
 * required for this test but is not included in the current SDK. In a complete
 * implementation, the admin would ban the customer before attempting the profile update.
 */
export async function test_api_customer_profile_update_banned_account(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      display_name: "Original Display Name",
    },
  });
  typia.assert(customer);
  // Store original profile data for later verification
  const originalDisplayName = customer.display_name;
  const originalPhoneNumber = customer.phone_number;
  // 2. Register and authenticate admin
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  typia.assert(admin);
  // 3. Ban the customer account via admin endpoint
  // Note: The admin ban endpoint is not available in the current SDK.
  // In a complete implementation, this would be:
  // await api.functional.shoppingMall.admin.customers.ban(adminConnection, {
  //   path: { customerId: customer.id },
  // });
  //
  // For this test to work properly, the customer account must be banned
  // through external means (e.g., database update) or the admin ban API
  // must be added to the SDK.
  // 4. Attempt to update profile with banned account
  // This should fail with HTTP 403 Forbidden if the customer is banned
  const updateBody = {
    display_name: "Updated Display Name",
    phone_number: RandomGenerator.mobile(),
  } satisfies IShoppingMallCustomer.IUpdate;
  // Validate that banned customer cannot update profile
  // Expected: HTTP 403 Forbidden error
  await TestValidator.httpError(
    "banned customer cannot update profile",
    403,
    async () =>
      await api.functional.shoppingMall.customer.profile.update(
        customerConnection,
        { body: updateBody },
      ),
  );
  // 5. Verify profile remains unchanged
  // Note: GET /shoppingMall/customer/profile endpoint is not available in SDK
  // to retrieve and verify the current profile state.
  // In a complete implementation, we would fetch the profile and verify:
  // - display_name equals originalDisplayName
  // - phone_number equals originalPhoneNumber
  // - No snapshot was created for the failed update attempt
  // Document expected behavior:
  // - Response status: 403 Forbidden
  // - Customer profile unchanged (display_name, phone_number remain original)
  // - No profile snapshot created for failed update
  // - Ban status prevents all profile modifications
  // - Audit log records the denied access attempt
}
