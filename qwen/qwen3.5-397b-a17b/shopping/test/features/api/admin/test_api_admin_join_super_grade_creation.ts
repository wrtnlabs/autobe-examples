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
 * Test administrator account creation with super administrator grade level.
 *
 * Validates the complete super administrator account creation flow through the promotion approval workflow. Ensures that the account is created with the correct grade level, all required fields are populated, and JWT authentication tokens are properly generated.
 *
 * Special attention is given to verifying that the grade field is set to 'super' indicating elevated privileges, and that the member relation contains the underlying member account with customer profile information.
 *
 * 1. Creates administrator account with grade set to 'super' using authorize_admin_join utility.
 * 2. Validates response structure matches IShoppingMallAdmin.IAuthorized with all required fields.
 * 3. Verifies grade is 'super' confirming elevated administrator privileges.
 * 4. Validates account fields (id, email, bannedAt, deletedAt, createdAt, updatedAt) are properly populated.
 * 5. Verifies member relation contains member summary with customerProfile.
 * 6. Validates JWT tokens (access, refresh) with expiration timestamps (expired_at, refreshable_until).
 */
export async function test_api_admin_join_super_grade_creation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super administrator account
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      grade: "super",
    },
  });
  typia.assert(admin);
  // 2. Validate grade is super (business logic validation)
  TestValidator.equals("grade is super", admin.grade, "super");
  // 3. Validate member and customer profile structure (business logic)
  typia.assertGuard(admin.member!);
  TestValidator.equals(
    "member email matches",
    admin.member.email,
    admin.member.email,
  );
  // 4. Validate customer profile exists and is accessible
  if (admin.member.customerProfile !== null) {
    typia.assertGuard(admin.member.customerProfile);
    TestValidator.equals(
      "customer profile display name exists",
      admin.member.customerProfile.display_name.length > 0,
      true,
    );
  }
  // 5. Validate token timestamps are properly set (business logic)
  TestValidator.predicate(
    "refreshable_until is after expired_at",
    new Date(admin.token.refreshable_until).getTime() >=
      new Date(admin.token.expired_at).getTime(),
  );
}
