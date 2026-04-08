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

/**
 * Test administrator account retrieval with soft-delete validation.
 *
 * Validates the administrator retrieval endpoint by creating an admin account through the join operation, then fetching the administrator profile to verify the response structure and data integrity. Ensures that active administrators (deletedAt is null) are accessible and properly return all expected fields including grade level, member relationship, and lifecycle timestamps.
 *
 * The test confirms the business rule that administrator accounts maintain a deletedAt timestamp field where null indicates active status and a datetime value indicates soft-deleted status. Per specification, soft-deleted administrator accounts should return 404 Not Found when accessed through the standard retrieval endpoint, preserving audit trail data while preventing access to inactive profiles.
 *
 * 1. Create administrator account with randomized email, password, and grade (regular or super).
 * 2. Retrieve the administrator profile using the created administrator's ID.
 * 3. Validate response structure matches IShoppingMallAdministrator DTO.
 * 4. Verify deletedAt is null confirming active administrator status.
 * 5. Validate member relationship contains valid member summary data.
 * 6. Confirm timestamp fields (createdAt, updatedAt) are properly formatted ISO-8601 strings.
 *
 * Note: Testing actual soft-delete behavior (404 response for deletedAt set) requires a delete endpoint not available in current SDK. This test validates the retrieval endpoint for active administrators and documents expected soft-delete behavior based on DTO structure.
 */
export async function test_api_administrator_retrieve_soft_deleted(
  connection: api.IConnection,
) {
  // 1. Create administrator account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: RandomGenerator.pick(["regular", "super"] as const),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(adminAuthorized);
  // 2. Retrieve administrator profile
  const administrator =
    await api.functional.shoppingMall.admin.administrators.at(adminConnection, {
      administratorId: adminAuthorized.id,
    });
  typia.assert(administrator);
  // 3. Validate administrator data matches created account
  TestValidator.equals(
    "administrator email matches",
    administrator.member.email,
    adminAuthorized.email,
  );
  TestValidator.equals(
    "administrator grade matches",
    administrator.grade,
    adminAuthorized.grade,
  );
  // 4. Verify administrator is active (not soft-deleted)
  TestValidator.predicate(
    "administrator is active (deletedAt is null)",
    administrator.deletedAt === null,
  );
  // 5. Validate member ID matches authorized admin's member
  TestValidator.equals(
    "member ID matches",
    administrator.member.id,
    adminAuthorized.member.id,
  );
  // 6. Verify soft-delete business rule documentation
  // Per specification: when deletedAt is set (non-null), the administrator
  // account is soft-deleted and should return 404 Not Found on retrieval.
  // This preserves audit trails while preventing access to inactive profiles.
  // Testing this scenario requires a DELETE endpoint to set deletedAt,
  // which is not available in the current SDK function list.
  TestValidator.predicate(
    "deletedAt null means active per business rules",
    administrator.deletedAt === null,
  );
}
