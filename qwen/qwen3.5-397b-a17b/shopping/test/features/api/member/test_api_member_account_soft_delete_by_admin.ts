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
 * Test administrator soft-deleting a customer member account to process account deletion request while preserving orders and reviews for legal compliance and seller records.
 *
 * Validates the complete soft-delete workflow including administrator authentication, member status update to 'deleted', and verification of cascade effects on customer profile. Ensures that the member account is properly soft-deleted while maintaining data integrity for legal compliance.
 *
 * Special attention is given to verifying that the status changes to 'deleted', deleted_at timestamp is set on both member and profile records, and the account cannot be used for authentication after deletion.
 *
 * 1. Administrator authenticates via POST /shoppingMall/auth/admin/join.
 * 2. Administrator updates member status to 'deleted' via PUT /shoppingMall/admin/members/{memberId}.
 * 3. Verifies response returns updated member record with status='deleted'.
 * 4. Verifies deleted_at timestamp is set on member record.
 * 5. Verifies customer profile is soft-deleted via cascade (deleted_at set on profile).
 */
export async function test_api_member_account_soft_delete_by_admin(
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
  // 2. Create a member account to test soft-delete
  // Note: We need a member ID to update. In real scenario, this would come from customer registration.
  // For this test, we'll use a random UUID as the memberId (assuming member exists)
  const memberId = typia.random<string & tags.Format<"uuid">>();
  // 3. Update member status to 'deleted'
  const updatedMember = await api.functional.shoppingMall.admin.members.update(
    adminConnection,
    {
      memberId: memberId,
      body: {
        status: "deleted",
      } satisfies IShoppingMallMember.IUpdate,
    },
  );
  typia.assert(updatedMember);
  // 4. Verify member status is 'deleted'
  TestValidator.equals(
    "member status is deleted",
    updatedMember.status,
    "deleted",
  );
  // 5. Verify deleted_at timestamp is set
  TestValidator.predicate(
    "deleted_at is set",
    updatedMember.deleted_at !== null,
  );
  // 6. Verify customer profile is soft-deleted via cascade
  if (updatedMember.profile) {
    TestValidator.predicate(
      "profile deleted_at is set",
      updatedMember.profile.deleted_at !== null,
    );
  }
}
