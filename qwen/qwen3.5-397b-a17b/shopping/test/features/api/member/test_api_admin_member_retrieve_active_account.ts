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
 * Test the administrator's ability to retrieve a specific active member account details.
 *
 * Validates the complete member retrieval flow including administrative authentication and member account lookup. Ensures that the response contains complete member information with proper structure for user management purposes.
 *
 * The test verifies that administrators can access member account details including email, account status, timestamps, and customer profile information. This endpoint is essential for administrative oversight and customer support operations.
 *
 * 1. Administrator authenticates via join operation to obtain access token.
 * 2. Administrator calls GET /shoppingMall/admin/members/{memberId} with member UUID.
 * 3. Validates response structure using typia.assert() for complete type validation.
 * 4. Verifies customerProfile structure when present using typia.assert().
 * 5. Confirms administrator relation structure when present.
 *
 * Note: This test requires a pre-existing customer member account in the test environment.
 */
export async function test_api_admin_member_retrieve_active_account(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication via join
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: RandomGenerator.pick(["regular", "super"] as const),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 2. Retrieve member account by ID
  // Note: This test assumes a pre-existing member account exists in the test environment
  const memberId = typia.random<string & tags.Format<"uuid">>();
  const member: IShoppingMallMember =
    await api.functional.shoppingMall.admin.members.at(adminConnection, {
      memberId,
    });
  typia.assert(member);
  // 3. Validate customerProfile structure when present
  // typia.assert() already validates all member fields, so only validate nested profile
  if (member.profile !== null) {
    typia.assert(member.profile);
  }
  // 4. Validate administrator relation when present
  if (member.administrator !== null) {
    typia.assert(member.administrator);
  }
}
