import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
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

/**
 * Test administrator retrieval of customer profile information.
 *
 * Validates that an authenticated administrator can successfully access and retrieve a customer's complete profile data including display name, phone number, and member account information. The test ensures proper authorization controls and data integrity for administrative oversight operations.
 *
 * This test verifies the admin customer profile endpoint returns all required fields with correct data types and that the profile belongs to an active (non-deleted) customer account. The administrator authentication flow is tested as a prerequisite for accessing customer data.
 *
 * 1. Administrator authenticates using the join endpoint to obtain access token.
 * 2. Administrator retrieves customer profile using the customer ID.
 * 3. Validates response structure matches IShoppingMallCustomerProfile schema.
 * 4. Verifies profile data integrity including display_name, phone_number, and member relation.
 * 5. Confirms deleted_at is null indicating active customer account.
 * 6. Validates timestamp formats are ISO 8601 compliant.
 */
export async function test_api_customer_profile_retrieval_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: RandomGenerator.pick(["regular", "super"] as const),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 2. Generate customer ID for profile retrieval
  const customerId = typia.random<string & tags.Format<"uuid">>();
  // 3. Retrieve customer profile
  const profile = await api.functional.shoppingMall.admin.customers.profile.at(
    adminConnection,
    {
      customerId,
    },
  );
  typia.assert(profile);
  // 4. Validate business logic - ID consistency
  TestValidator.equals("customer ID matches", profile.id, customerId);
  // 5. Validate profile is active (not soft deleted)
  TestValidator.equals("deleted_at is null", profile.deleted_at, null);
  // 6. Validate member relation consistency
  TestValidator.predicate("member exists", profile.member !== null);
  TestValidator.predicate(
    "member has valid status",
    profile.member.status !== "",
  );
  // 7. Validate customerProfile relation consistency with profile
  if (profile.member.customerProfile) {
    TestValidator.equals(
      "profile ID matches member.customerProfile.id",
      profile.member.customerProfile.id,
      profile.id,
    );
    TestValidator.equals(
      "display name matches",
      profile.member.customerProfile.display_name,
      profile.display_name,
    );
    TestValidator.equals(
      "phone number matches",
      profile.member.customerProfile.phone_number,
      profile.phone_number,
    );
  }
}
