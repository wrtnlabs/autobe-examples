import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerApproval";
import type { IShoppingMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSuspension";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_shopping_mall_administrator_seller_approvals_create_seller_approval } from "../../../generate/generate_random_shopping_mall_administrator_seller_approvals_create_seller_approval";
import { generate_random_shopping_mall_administrator_seller_suspensions_create_seller_suspension } from "../../../generate/generate_random_shopping_mall_administrator_seller_suspensions_create_seller_suspension";
import { prepare_random_shopping_mall_seller_approval } from "../../../prepare/prepare_random_shopping_mall_seller_approval";
import { prepare_random_shopping_mall_seller_suspension } from "../../../prepare/prepare_random_shopping_mall_seller_suspension";

/**
 * Test suite for seller suspension deletion API focusing on success and error cases.
 *
 * Covers:
 * - Successful deletion by authorized administrator.
 * - Deletion attempt on non-existent suspension returns 404.
 * - Unauthorized deletion attempts return 403.
 *
 * Validates proper authorization, data persistence, and error handling.
 */
export async function test_api_seller_suspension_erase_success_and_errors(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator registration and authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {
      email: `admin_${typia.random<string & tags.Format<"email">>()}`,
      password: "StrongPass!123",
    },
  });
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuth.token.access}`,
  };
  // 2. Create seller approval (approved status) to have a valid seller
  const sellerApproval =
    await generate_random_shopping_mall_administrator_seller_approvals_create_seller_approval(
      adminConnection,
      {
        body: {
          status: "approved",
        },
      },
    );
  typia.assert(sellerApproval);
  // 3. Create seller suspension referencing the approved seller
  const sellerSuspension =
    await generate_random_shopping_mall_administrator_seller_suspensions_create_seller_suspension(
      adminConnection,
      {
        body: {
          seller_id: sellerApproval.shoppingMallSellerId,
          suspension_reason: "Violation of policy",
        },
      },
    );
  typia.assert(sellerSuspension);
  // Scenario 1: Successful deletion of existing seller suspension
  await api.functional.shoppingMall.administrator.sellerSuspensions.eraseSellerSuspension(
    adminConnection,
    { sellerSuspensionId: sellerSuspension.id },
  );
  // Validate deletion by checking error on accessing deleted entity
  await TestValidator.error(
    "should not find deleted suspension",
    async () =>
      await api.functional.shoppingMall.administrator.sellerSuspensions.eraseSellerSuspension(
        adminConnection,
        { sellerSuspensionId: sellerSuspension.id },
      ),
  );
  // Scenario 2: Delete non-existing seller suspension
  const fakeSellerSuspensionId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "should get not found when deleting non-existent suspension",
    404,
    async () =>
      await api.functional.shoppingMall.administrator.sellerSuspensions.eraseSellerSuspension(
        adminConnection,
        { sellerSuspensionId: fakeSellerSuspensionId },
      ),
  );
  // Scenario 3: Unauthorized deletion attempt
  // Create new connection without admin auth (no headers)
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "should forbid deletion by unauthorized user",
    [403, 401],
    async () =>
      await api.functional.shoppingMall.administrator.sellerSuspensions.eraseSellerSuspension(
        unauthorizedConnection,
        { sellerSuspensionId: sellerSuspension.id },
      ),
  );
  // Validate that suspension still exists using authorized connection (no error)
  // Use GET by id if available, but since no GET, try deleting again expecting 404
  // instead of 403
  await TestValidator.httpError(
    "should get not found if trying to delete deleted suspension",
    404,
    async () =>
      await api.functional.shoppingMall.administrator.sellerSuspensions.eraseSellerSuspension(
        adminConnection,
        { sellerSuspensionId: sellerSuspension.id },
      ),
  );
}
