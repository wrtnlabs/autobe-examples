import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicForumAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicForumAdmin";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_admin_account_update_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEconomicForumAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // Step 2: Use the authenticated admin connection to update the admin's email
  const newEmail = typia.random<string & tags.Format<"email">>();
  const updatedAdmin = await api.functional.economicForum.admin.admins.update(
    adminConnection,
    {
      adminId: adminAuth.id,
      body: { email: newEmail } satisfies IEconomicForumAdmin.IUpdate,
    },
  );
  typia.assert(updatedAdmin);
  // Step 3: Verify the update response structure is correct
  // IEconomicForumAdmin contains: id (uuid) and token (IAuthorizationToken)
  TestValidator.equals(
    "admin ID matches the original",
    updatedAdmin.id,
    adminAuth.id,
  );
  TestValidator.equals(
    "token.access not empty",
    updatedAdmin.token.access.length > 0,
    true,
  );
  TestValidator.equals(
    "token.refresh not empty",
    updatedAdmin.token.refresh.length > 0,
    true,
  );
  TestValidator.predicate("token expired_at is valid date-time", () => {
    return !isNaN(new Date(updatedAdmin.token.expired_at).getTime());
  });
  TestValidator.predicate("token refreshable_until is valid date-time", () => {
    return !isNaN(new Date(updatedAdmin.token.refreshable_until).getTime());
  });
}
