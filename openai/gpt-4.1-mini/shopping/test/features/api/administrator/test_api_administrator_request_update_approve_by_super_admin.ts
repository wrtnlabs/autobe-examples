import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_request_update_approve_by_super_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and login as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_administrator_join(superAdminConnection, {
    body: {
      email: `super_${typia.random<string & tags.Format<"email">>()}`,
      password: "superadmin123",
    },
  });
  typia.assert(superAdmin);
  // Assert that superAdmin.isSuperAdmin is true
  TestValidator.predicate(
    "superAdmin is super administrator",
    superAdmin.isSuperAdmin,
  );
  // 2. Create an administrator request with 'pending' status
  // Since utility for creating administrator request is not provided, we simulate generating a pending request
  // We simulate by joining a normal administrator user and then pretending their request is pending
  // Create and login a normal administrator (not super admin)
  const normalAdminConnection: api.IConnection = { host: connection.host };
  const normalAdmin = await authorize_administrator_join(
    normalAdminConnection,
    {
      body: {
        email: `normal_${typia.random<string & tags.Format<"email">>()}`,
        password: "normaladmin123",
      },
    },
  );
  typia.assert(normalAdmin);
  // Assert that normalAdmin.isSuperAdmin is false
  TestValidator.predicate(
    "normalAdmin is NOT super administrator",
    !normalAdmin.isSuperAdmin,
  );
  // Since we don't have API to create administratorRequest directly, we simulate one
  // Generate a pending administratorRequest object
  const pendingRequest: IShoppingMallAdministratorRequest = {
    id: typia.random<string & tags.Format<"uuid">>(),
    actorType: "customer",
    reason: RandomGenerator.paragraph({ sentences: 3 }),
    status: "pending",
    createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(), // 1 hour ago
    updatedAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(), // 1 hour ago
    deletedAt: null,
  };
  // 3. Update administratorRequest status to 'approved' by super administrator
  const updateBody: IShoppingMallAdministratorRequest.IUpdate = {
    status: "approved",
    reason: RandomGenerator.paragraph({ sentences: 2 }),
  };
  const updatedRequest =
    await api.functional.shoppingMall.administrator.administratorRequests.updateAdministratorRequest(
      superAdminConnection,
      {
        administratorRequestId: pendingRequest.id,
        body: updateBody,
      },
    );
  typia.assert(updatedRequest);
  // 4. Assertions
  TestValidator.equals(
    "status updated to approved",
    updatedRequest.status,
    "approved",
  );
  TestValidator.predicate(
    "updatedAt timestamp updated",
    new Date(updatedRequest.updatedAt) > new Date(pendingRequest.updatedAt),
  );
  TestValidator.equals(
    "reason updated correctly",
    updatedRequest.reason,
    updateBody.reason,
  );
  // 5. Validate all required fields presence and types
  typia.assert<IShoppingMallAdministratorRequest>(updatedRequest);
  // 6. Try to update by normal administrator should fail (unauthorized or forbidden error)
  await TestValidator.error("normal admin cannot approve request", async () => {
    await api.functional.shoppingMall.administrator.administratorRequests.updateAdministratorRequest(
      normalAdminConnection,
      {
        administratorRequestId: pendingRequest.id,
        body: {
          status: "approved",
        },
      },
    );
  });
}
