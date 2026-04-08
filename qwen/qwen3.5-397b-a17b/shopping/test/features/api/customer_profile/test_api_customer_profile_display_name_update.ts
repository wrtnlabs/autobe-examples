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
 * Test administrator updating customer profile display name.
 *
 * Validates the complete workflow of an administrator updating a customer's display name through the admin profile management endpoint. The test ensures that administrators can modify customer profile information while preserving unchanged fields.
 *
 * The test creates both administrator and customer accounts, then uses the administrator credentials to update the customer's display name. It verifies that the display name is updated correctly, the phone number remains unchanged, and the updated_at timestamp reflects the modification.
 *
 * 1. Administrator account is created and authenticated via /shoppingMall/auth/admin/join.
 * 2. Customer member account is created via /shoppingMall/auth/member/join with auto-generated profile.
 * 3. Administrator calls PATCH /shoppingMall/admin/customers/{customerId}/profile with new display_name.
 * 4. Validates response contains updated display name matching the input value.
 * 5. Validates phone_number remains unchanged from original customer profile.
 * 6. Validates updated_at timestamp is newer than created_at, confirming update was applied.
 */
export async function test_api_customer_profile_display_name_update(
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
  // 2. Create customer member account (auto-creates profile)
  const customerAuth = await authorize_member_join(
    { host: connection.host },
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(customerAuth);
  // Store original profile data for validation
  typia.assertGuard(customerAuth.profile!);
  const originalProfile = customerAuth.profile;
  // 3. Administrator updates customer's display name
  const newDisplayName = RandomGenerator.name();
  const updatedProfile =
    await api.functional.shoppingMall.admin.customers.profile.update(
      adminConnection,
      {
        customerId: customerAuth.id,
        body: {
          displayName: newDisplayName,
        } satisfies IShoppingMallCustomerProfile.IUpdate,
      },
    );
  typia.assert(updatedProfile);
  // 4. Validate display name was updated
  TestValidator.equals(
    "display name updated",
    updatedProfile.display_name,
    newDisplayName,
  );
  // 5. Validate phone number remains unchanged
  TestValidator.equals(
    "phone number unchanged",
    updatedProfile.phone_number,
    originalProfile.phone_number,
  );
  // 6. Validate updated_at is newer than created_at
  const createdAt = new Date(updatedProfile.created_at).getTime();
  const updatedAt = new Date(updatedProfile.updated_at).getTime();
  TestValidator.predicate(
    "updated_at is newer than created_at",
    updatedAt > createdAt,
  );
  // 7. Validate profile ID and member relation remain consistent
  TestValidator.equals(
    "profile id unchanged",
    updatedProfile.id,
    originalProfile.id,
  );
  TestValidator.equals(
    "member id unchanged",
    updatedProfile.member.id,
    originalProfile.member.id,
  );
}
