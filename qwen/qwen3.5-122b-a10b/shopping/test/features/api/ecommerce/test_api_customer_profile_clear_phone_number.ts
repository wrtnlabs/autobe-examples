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

export async function test_api_customer_profile_clear_phone_number(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test that an authenticated admin can clear their phone_number by setting it to null.
   *
   * Validates the admin profile update endpoint's ability to clear optional contact information. The admin registers with the system, then updates their profile by setting phone_number to null while keeping display_name unchanged. The response is validated to confirm the phone_number field is properly cleared.
   *
   * This test specifically validates:
   * 1. Admin authentication workflow
   * 2. Profile update with null phone_number value
   * 3. Response structure integrity after null field update
   * 4. Display name persistence during partial profile updates
   *
   * 1. Admin registers with email, password, and approval reason.
   * 2. Admin updates profile with display_name unchanged and phone_number set to null.
   * 3. Validates response contains updated customer object with phone_number as null.
   * 4. Confirms display_name remains unchanged after the update operation.
   */
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      reason: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Update admin profile to clear phone_number
  const initialDisplayName = RandomGenerator.name();
  const updated = await api.functional.ecommerce.admin.profiles.update(
    adminConnection,
    {
      body: {
        display_name: initialDisplayName,
        phone_number: null,
      } satisfies IEcommerceCustomer.IUpdate,
    },
  );
  typia.assert(updated);
  // 3. Validate phone_number is null
  TestValidator.equals("phone_number cleared", updated.phone_number, null);
  TestValidator.equals(
    "display_name preserved",
    updated.display_name,
    initialDisplayName,
  );
}
