import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerApproval";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_shopping_mall_administrator_seller_approvals_create_approval } from "../../../generate/generate_random_shopping_mall_administrator_seller_approvals_create_approval";
import { prepare_random_shopping_mall_seller_approval } from "../../../prepare/prepare_random_shopping_mall_seller_approval";

/**
 * Tests for creating seller approval records by administrator.
 *
 * This suite tests three scenarios:
 * 1. Creation with status 'pending'
 * 2. Creation with status 'approved'
 * 3. Creation with status 'rejected' and rejection reason
 */
export async function test_api_seller_approval_create(
  connection: api.IConnection,
) {
  // Administrator registration for authorization
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: typia.random<IShoppingMallAdministrator.IJoin>(),
  });
  // Set Authorization header for subsequent calls
  adminConnection.headers = {
    Authorization: `Bearer ${admin.token.access}`,
  };
  // Scenario 1: Create approval with status 'pending'
  const approvalPending =
    await generate_random_shopping_mall_administrator_seller_approvals_create_approval(
      adminConnection,
      {
        body: { status: "pending" },
      },
    );
  typia.assert(approvalPending);
  // Removed validation of non-existent properties

  // Scenario 2: Create approval with status 'approved'
  const approvalApproved =
    await generate_random_shopping_mall_administrator_seller_approvals_create_approval(
      adminConnection,
      {
        body: { status: "approved" },
      },
    );
  typia.assert(approvalApproved);
  // Removed validation of non-existent properties

  // Scenario 3: Create approval with status 'rejected' and rejection reason
  const rejectionReason = "Test rejection due to invalid documents.";
  const approvalRejected =
    await generate_random_shopping_mall_administrator_seller_approvals_create_approval(
      adminConnection,
      {
        body: {
          status: "rejected",
          rejection_reason: rejectionReason,
        },
      },
    );
  typia.assert(approvalRejected);
  // Removed validation of non-existent properties
}
