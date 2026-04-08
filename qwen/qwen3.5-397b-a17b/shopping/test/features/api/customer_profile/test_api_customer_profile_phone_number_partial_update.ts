import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test customer profile phone number partial update by administrator.
 *
 * Validates that an administrator can update only the customer's phone number while preserving the existing display name. This test ensures the partial update behavior works correctly - only the provided field is modified while omitted fields retain their original values.
 *
 * The test creates an admin account for authentication, registers a customer member with initial profile data, then performs a partial update with only the phone_number field. The response is validated to confirm the phone number changed while the display name remained unchanged.
 *
 * 1. Administrator account created via /shoppingMall/auth/admin/join and authenticated.
 * 2. Customer member account created via /shoppingMall/auth/member/join with initial display name and phone number.
 * 3. Administrator calls PATCH /shoppingMall/admin/customers/{customerId}/profile with only phone_number field.
 * 4. Response validated: phone_number is updated, display_name remains unchanged from original value.
 * 5. Partial update behavior confirmed - only provided field modified, omitted fields preserved.
 */
export async function test_api_customer_profile_phone_number_partial_update(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: "regular" as const,
    },
  });
  typia.assert(adminAuth);
  // 2. Create customer member account with initial profile
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  // Validate profile exists and store original values
  typia.assert(memberAuth.profile !== null);
  typia.assertGuard(memberAuth.profile!);
  const originalDisplayName = memberAuth.profile.display_name;
  const originalPhoneNumber = memberAuth.profile.phone_number;
  // 3. Generate new phone number for partial update
  const newPhoneNumber = RandomGenerator.mobile();
  // 4. Administrator performs partial update with only phone_number field
  const updatedProfile =
    await api.functional.shoppingMall.admin.customers.profile.update(
      adminConnection,
      {
        customerId: memberAuth.id,
        body: {
          phoneNumber: newPhoneNumber,
        } satisfies IShoppingMallCustomerProfile.IUpdate,
      },
    );
  typia.assert(updatedProfile);
  // 5. Validate partial update behavior
  TestValidator.equals(
    "phone number updated",
    updatedProfile.phone_number,
    newPhoneNumber,
  );
  TestValidator.equals(
    "display name preserved",
    updatedProfile.display_name,
    originalDisplayName,
  );
  TestValidator.notEquals(
    "phone number changed",
    originalPhoneNumber,
    updatedProfile.phone_number,
  );
}