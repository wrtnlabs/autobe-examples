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
 * Test administrator retrieval by administrator authentication.
 *
 * Validates the complete administrator profile retrieval workflow including administrator account creation through the join operation, authentication, and retrieving administrator details by ID. Ensures that the response contains all required fields with correct types and that the member relationship is properly populated.
 *
 * Special attention is given to verifying that the grade field correctly reflects the administrator's permission level (regular or super), the member account information includes all expected fields (id, email, status, customerProfile), and the timestamps are in proper ISO-8601 format. The deletedAt field should be null for active administrators.
 *
 * 1. Administrator account is created using the join operation with randomized credentials and grade.
 * 2. The authenticated administrator calls the GET endpoint to retrieve their own profile.
 * 3. Validates response structure includes id, grade, member, createdAt, updatedAt, deletedAt.
 * 4. Confirms member relationship contains id, email, status, and customerProfile with display_name and phone_number.
 * 5. Verifies grade is either 'regular' or 'super' and deletedAt is null for active account.
 */
export async function test_api_administrator_retrieve_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate administrator account
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: RandomGenerator.pick(["regular", "super"] as const),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(authorized);
  // 2. Retrieve administrator profile by ID
  const administrator =
    await api.functional.shoppingMall.admin.administrators.at(adminConnection, {
      administratorId: authorized.id,
    });
  typia.assert(administrator);
  // 3. Validate administrator profile structure
  TestValidator.equals(
    "administrator id matches",
    administrator.id,
    authorized.id,
  );
  TestValidator.predicate(
    "grade is valid",
    administrator.grade === "regular" || administrator.grade === "super",
  );
  TestValidator.predicate(
    "deletedAt is null for active admin",
    administrator.deletedAt === null,
  );
  // 4. Validate member relationship exists and has required fields
  TestValidator.equals(
    "member id matches pattern",
    typeof administrator.member.id,
    "string",
  );
  TestValidator.equals(
    "member email is string",
    typeof administrator.member.email,
    "string",
  );
  TestValidator.predicate(
    "member status is non-empty",
    administrator.member.status.length > 0,
  );
  // 5. Validate customer profile if it exists
  if (administrator.member.customerProfile !== null) {
    TestValidator.predicate(
      "customer profile has display name",
      administrator.member.customerProfile.display_name.length > 0,
    );
    TestValidator.predicate(
      "customer profile has phone number",
      administrator.member.customerProfile.phone_number.length > 0,
    );
  }
}
