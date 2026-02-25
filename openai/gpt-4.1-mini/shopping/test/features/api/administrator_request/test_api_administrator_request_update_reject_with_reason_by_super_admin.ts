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

/**
 * Test the rejection of an administrator request by super administrator.
 *
 * 1. Create and authorize a super administrator account
 * 2. Create a new administrator request entity with status 'pending'
 * 3. Perform PUT update to reject the administrator request with reason
 * 4. Validate response and fields, including updated timestamp and reason
 */
export async function test_api_administrator_request_update_reject_with_reason_by_super_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authorize a super administrator account
  const adminConnection: api.IConnection = { host: connection.host };
  const joinBody: IShoppingMallAdministrator.IJoin = {
    email: `superadmin_${RandomGenerator.alphaNumeric(8)}@test.com`,
    password: "superStrongP@ss", // compliant with min length
  };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: joinBody,
  });
  typia.assert(adminAuth);
  // Confirm the authorized administrator is super admin
  TestValidator.predicate(
    "authorized admin is super admin",
    adminAuth.isSuperAdmin === true,
  );
  // 2. Create a new administrator request entity with status 'pending'
  // Since creating admin requests is out of direct API scope, we simulate the creation
  // by calling the update endpoint with 'pending' initial status
  const requestId = typia.random<string & tags.Format<"uuid">>();
  // Initial request body with pending status and reason
  const initialBody: IShoppingMallAdministratorRequest.IUpdate = {
    status: "pending",
    reason: "Initial request for administrator role",
  };
  // We simulate creation by directly calling the update endpoint with new id
  // though normally creation is separate. We do it as necessary workaround.
  const createResponse =
    await api.functional.shoppingMall.administrator.administratorRequests.updateAdministratorRequest(
      adminConnection,
      {
        administratorRequestId: requestId,
        body: initialBody,
      },
    );
  typia.assert(createResponse);
  // 3. Perform PUT update to reject the administrator request with reason
  const rejectionReason = `Rejected due to policy violation - ${RandomGenerator.alphabets(12)}`;
  const updateBody: IShoppingMallAdministratorRequest.IUpdate = {
    status: "rejected",
    reason: rejectionReason,
  };
  const updatedResponse =
    await api.functional.shoppingMall.administrator.administratorRequests.updateAdministratorRequest(
      adminConnection,
      {
        administratorRequestId: requestId,
        body: updateBody,
      },
    );
  // 4. Validate response and fields, including updated timestamp and reason
  typia.assert(updatedResponse);
  TestValidator.equals(
    "status is rejected",
    updatedResponse.status,
    "rejected",
  );
  TestValidator.equals(
    "reason matches rejection reason",
    updatedResponse.reason,
    rejectionReason,
  );
  TestValidator.predicate(
    "updatedAt is updated",
    new Date(updatedResponse.updatedAt).getTime() >=
      new Date(createResponse.updatedAt).getTime(),
  );
  TestValidator.equals("id is same", updatedResponse.id, requestId);
  TestValidator.notEquals(
    "updated response differs from initial create response",
    createResponse,
    updatedResponse,
  );
}
