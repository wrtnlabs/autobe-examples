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
 * Test administrator retrieval of non-existent member account.
 *
 * Validates that the system properly handles requests for member accounts that do not exist in the database. An administrator authenticates via the join operation, then attempts to retrieve a member using a valid UUID format that does not correspond to any actual member record.
 *
 * This test ensures the endpoint correctly validates member existence before returning data. The system should return a 404 Not Found response when the memberId does not match any record in the shopping_mall_members table, preventing information leakage about system structure while maintaining proper error handling.
 *
 * 1. Administrator authenticates via join operation with randomized credentials.
 * 2. Generate a valid UUID that does not exist in the member database.
 * 3. Call GET /shoppingMall/admin/members/{memberId} with the non-existent UUID.
 * 4. Verify the system returns 404 Not Found HTTP status code.
 */
export async function test_api_admin_member_retrieve_not_found(
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
  // 2. Generate non-existent member UUID
  const nonExistentMemberId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Attempt to retrieve non-existent member - should return 404
  await TestValidator.httpError(
    "non-existent member returns 404",
    404,
    async () => {
      await api.functional.shoppingMall.admin.members.at(adminConnection, {
        memberId: nonExistentMemberId,
      });
    },
  );
}
