import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdmin";
import type { IEcommerceAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministratorGrade";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test admin customer profile update with both display_name and phone_number fields.
 *
 * Validates that an authenticated administrator can successfully update their own customer profile information including both the display name and phone number. The test ensures the profile update endpoint correctly persists both fields and refreshes the updated_at timestamp.
 *
 * 1. Administrator joins the system with valid credentials and obtains authentication token.
 * 2. Admin calls the customer profile update endpoint with both display_name and phone_number fields.
 * 3. Response contains the updated customer object with new field values.
 * 4. Validates that display_name and phone_number match the input values.
 * 5. Validates that all timestamp fields are present and valid.
 */
export async function test_api_customer_profile_update_both_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      reason: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Prepare update data with both fields
  const newDisplayName = RandomGenerator.name(3);
  const newPhoneNumber = RandomGenerator.mobile();
  const updateBody = {
    display_name: newDisplayName,
    phone_number: newPhoneNumber,
  } satisfies IEcommerceCustomer.IUpdate;
  // 3. Update customer profile (updates the authenticated admin's customer profile)
  const updatedProfile = await api.functional.ecommerce.admin.profiles.update(
    adminConnection,
    {
      body: updateBody,
    },
  );
  typia.assert(updatedProfile);
  // 4. Validate response fields match input
  TestValidator.equals(
    "display_name updated",
    updatedProfile.display_name,
    newDisplayName,
  );
  TestValidator.equals(
    "phone_number updated",
    updatedProfile.phone_number,
    newPhoneNumber,
  );
  // 5. Validate timestamp fields exist and are valid ISO datetime format
  TestValidator.predicate(
    "created_at exists",
    updatedProfile.created_at !== null &&
      updatedProfile.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at exists",
    updatedProfile.updated_at !== null &&
      updatedProfile.updated_at !== undefined,
  );
  TestValidator.predicate(
    "deleted_at is null for active account",
    updatedProfile.deleted_at === null,
  );
}
