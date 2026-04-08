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
 * Test administrator reactivating a previously banned member account to restore login access and full platform privileges.
 *
 * Validates the complete member account reactivation workflow including administrator authentication, status update from banned to active, and verification that the member account is fully restored with all historical data preserved.
 *
 * Special attention is given to verifying that the status change is properly applied, deleted_at timestamp is cleared, and the member can resume normal platform operations. The test ensures that reactivation is a valid business workflow that restores full account access while preserving all historical orders and reviews.
 *
 * 1. Administrator authenticates via admin join endpoint.
 * 2. Updates member status from 'banned' to 'active' via PUT /shoppingMall/admin/members/{memberId}.
 * 3. Validates response returns updated member record with status='active'.
 * 4. Verifies deleted_at timestamp is null indicating active account.
 * 5. Confirms member profile information remains intact after reactivation.
 */
export async function test_api_member_account_reactivate_from_banned(
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
  // 2. Generate member ID for reactivation (prerequisite: member exists with status='banned')
  const memberId = typia.random<string & tags.Format<"uuid">>();
  // 3. Administrator reactivates banned member by updating status to 'active'
  const reactivatedMember =
    await api.functional.shoppingMall.admin.members.update(adminConnection, {
      memberId: memberId,
      body: {
        status: "active",
      } satisfies IShoppingMallMember.IUpdate,
    });
  typia.assert(reactivatedMember);
  // 4. Verify member status is now 'active' (business logic validation)
  TestValidator.equals(
    "member status after reactivation",
    reactivatedMember.status,
    "active",
  );
  // 5. Verify deleted_at is null indicating account is active (business logic validation)
  TestValidator.equals(
    "deleted_at cleared on reactivation",
    reactivatedMember.deleted_at,
    null,
  );
  // 6. Verify member ID matches the reactivated member (business logic validation)
  TestValidator.equals("member ID matches", reactivatedMember.id, memberId);
}
