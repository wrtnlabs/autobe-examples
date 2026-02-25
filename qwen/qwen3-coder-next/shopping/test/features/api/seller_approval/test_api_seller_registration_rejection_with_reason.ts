import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerApproval";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_seller_registration_rejection_with_reason(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a seller registration request first (this would normally be done by a user)
  // Since we don't have seller registration SDK function, we'll simulate the seller request creation
  // For now, we'll focus on the admin rejection workflow using available APIs
  // 2. Admin login to get authorization
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail = "admin@test.com";
  const adminPassword = "admin1234";
  const adminLogin: IShoppingMallAdmin.IAuthorized =
    await authorize_admin_login(adminConnection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IShoppingMallAdmin.IJoin,
    });
  typia.assert(adminLogin);
  // 3. Since we don't have a way to create a seller request in the SDK,
  // we'll use a dummy seller request ID for testing the rejection functionality
  // In real scenario, a seller would register and create a pending request
  const sellerRequestId = typia.random<string & tags.Format<"uuid">>();
  // 4. Admin rejects the seller registration request
  const rejectionResponse: IShoppingMallSellerApproval.IApprovalResponse =
    await api.functional.shoppingMall.admin.admin.requests.approve.approveRequest(
      adminConnection,
      {
        requestId: sellerRequestId,
        body: {
          approval_action: "rejected",
          rejection_reason: "Shop name violates community guidelines",
        } satisfies IShoppingMallSellerApproval.IApprovalRequest,
      },
    );
  typia.assert(rejectionResponse);
  // 5. Verify rejection workflow results
  TestValidator.equals(
    "seller approval status is rejected",
    rejectionResponse.approval_status,
    "rejected",
  );
  TestValidator.equals(
    "rejection reason stored",
    rejectionResponse.rejection_reason,
    "Shop name violates community guidelines",
  );
  TestValidator.predicate(
    "has valid rejection timestamp",
    rejectionResponse.processed_at !== null &&
      rejectionResponse.processed_at !== undefined,
  );
}
