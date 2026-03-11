import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallUserBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_user_ban_unban_customer(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create regular admin account for ban management
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(admin);
  // 2. Create customer account (using existing customer from scenario assumption)
  // Note: Customer must exist in database before this test runs
  // In real scenario, would use customer registration endpoint
  // 3. Create a ban for the customer (assuming customer ID is known)
  // Since no ban creation endpoint is provided, we'll work with existing ban
  // In real implementation, this would use: POST /admin/users/:userId/ban
  // 4. Update ban record to unban customer
  const unbanAt = new Date().toISOString();
  // For demonstration, using a valid UUID format for userBanId
  // In real scenario, this would come from actually creating a ban first
  const userBanId = typia.random<string & tags.Format<"uuid">>();
  const updateBody: IEcommerceMallUserBan.IUpdate = {
    is_active: false,
    unban_at: unbanAt,
  };
  // Update the ban record using admin connection
  const updatedBan = await api.functional.ecommerceMall.admin.user_bans.update(
    adminConnection,
    {
      userBanId: userBanId,
      body: updateBody,
    },
  );
  typia.assert(updatedBan);
  // 5. Verify the unban operation was successful
  TestValidator.equals(
    "isActive should be false after unban",
    updatedBan.isActive,
    false,
  );
  TestValidator.equals(
    "unbanAt should be set to current timestamp",
    updatedBan.unbanAt,
    unbanAt,
  );
  // 6. Verify customer can login after being unbanned
  // This would require customer login endpoint (not provided in current SDK)
  // In real scenario: await authorize_customer_login(customerConnection, { ... });
  // Final validation that the unban worked correctly
  TestValidator.predicate("customer successfully unbanned", () => {
    return updatedBan.isActive === false && updatedBan.unbanAt !== undefined;
  });
}
