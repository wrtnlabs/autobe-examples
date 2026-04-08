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
 * Test administrator account creation with regular grade level.
 *
 * Validates the complete administrator account creation workflow through the promotion approval system. This test ensures that when a member or seller's admin promotion request is approved, the system correctly creates an administrator account with the specified grade level and generates valid authentication tokens.
 *
 * The test verifies that the administrator account is properly linked to the underlying member account, all timestamps are correctly formatted, and the account is in an active state ready for administrative operations.
 *
 * 1. Creates administrator account with regular grade using authorize_admin_join utility.
 * 2. Validates response structure matches IShoppingMallAdmin.IAuthorized.
 * 3. Verifies grade is set to 'regular' as specified in the test.
 * 4. Verifies account is active (bannedAt and deletedAt are null).
 * 5. Verifies member relation contains underlying member account information.
 * 6. Verifies token contains access, refresh, expired_at, and refreshable_until.
 * 7. Validates all timestamps are properly formatted ISO 8601 date-time strings.
 */
export async function test_api_admin_join_regular_grade_creation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection and join with regular grade
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      grade: "regular" as const,
    },
  });
  typia.assert(admin);
  // 2. Verify grade is set to regular (business logic validation)
  TestValidator.equals("grade is regular", admin.grade, "regular");
  // 3. Verify account is active (not banned or deleted)
  TestValidator.equals("bannedAt is null", admin.bannedAt, null);
  TestValidator.equals("deletedAt is null", admin.deletedAt, null);
  // 4. Verify member relation is populated with underlying member account
  TestValidator.predicate("member relation exists", admin.member !== null);
  if (admin.member !== null) {
    TestValidator.predicate("member has valid id", admin.member.id.length > 0);
    TestValidator.predicate(
      "member has valid email",
      admin.member.email.length > 0,
    );
    TestValidator.predicate(
      "member has status",
      admin.member.status.length > 0,
    );
    TestValidator.predicate(
      "member has created_at",
      admin.member.created_at.length > 0,
    );
  }
  // 5. Verify token is present and usable for authentication
  TestValidator.predicate("access token exists", admin.token.access.length > 0);
  TestValidator.predicate(
    "refresh token exists",
    admin.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at is set",
    admin.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "refreshable_until is set",
    admin.token.refreshable_until.length > 0,
  );
}
