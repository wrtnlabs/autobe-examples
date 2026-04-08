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
 * Test administrator updating both display name and phone number in a single customer profile update request.
 *
 * Validates the complete workflow where an administrator updates multiple profile fields (display_name and phone_number) simultaneously for a customer account. The test ensures that both fields are updated atomically in one PATCH request and that the response reflects all changes correctly.
 *
 * The test creates necessary actor accounts (admin and customer), performs the profile update operation, and validates that the updated profile contains both new values with an updated timestamp.
 *
 * 1. Administrator account is created and authenticated via /shoppingMall/auth/admin/join.
 * 2. Customer member account is created with initial profile values via /shoppingMall/auth/member/join.
 * 3. Administrator calls PATCH /shoppingMall/admin/customers/{customerId}/profile with both display_name and phone_number fields.
 * 4. Response is validated to contain both updated values matching the request payload.
 * 5. Updated timestamp is verified to be later than the original profile creation time.
 */
export async function test_api_customer_profile_both_fields_update(
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
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_member_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(customerAuth);
  // Extract customer ID and initial profile data
  const customerId: string & tags.Format<"uuid"> = customerAuth.id;
  const initialProfile = customerAuth.profile;
  TestValidator.predicate(
    "customer has initial profile",
    initialProfile !== null,
  );
  const originalCreatedAt = initialProfile!.created_at;
  // 3. Administrator updates both display name and phone number
  const newDisplayName = RandomGenerator.name();
  const newPhoneNumber = RandomGenerator.mobile();
  const updateBody = {
    displayName: newDisplayName,
    phoneNumber: newPhoneNumber,
  } satisfies IShoppingMallCustomerProfile.IUpdate;
  const updatedProfile =
    await api.functional.shoppingMall.admin.customers.profile.update(
      adminConnection,
      {
        customerId: customerId,
        body: updateBody,
      },
    );
  typia.assert(updatedProfile);
  // 4. Verify both fields are updated correctly
  TestValidator.equals(
    "display name matches update request",
    updatedProfile.display_name,
    newDisplayName,
  );
  TestValidator.equals(
    "phone number matches update request",
    updatedProfile.phone_number,
    newPhoneNumber,
  );
  // 5. Verify updated_at timestamp is later than original created_at
  TestValidator.predicate(
    "updated_at is after original created_at",
    new Date(updatedProfile.updated_at).getTime() >=
      new Date(originalCreatedAt).getTime(),
  );
  // Verify profile ID remains unchanged
  TestValidator.equals(
    "profile ID unchanged",
    updatedProfile.id,
    initialProfile!.id,
  );
  // Verify member relation is preserved
  TestValidator.equals(
    "member ID preserved",
    updatedProfile.member.id,
    customerId,
  );
}
