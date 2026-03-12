import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerApprovalRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_seller_approval_requests_create } from "../../../generate/generate_random_shopping_mall_seller_seller_approval_requests_create";
import { prepare_random_shopping_mall_seller_approval_request } from "../../../prepare/prepare_random_shopping_mall_seller_approval_request";

/**
 * Test administrator approval of a pending seller registration request.
 *
 * Workflow:
 * 1. Register and authenticate as administrator
 * 2. Register and authenticate as seller
 * 3. Seller submits approval request with reason
 * 4. Admin approves the request
 * 5. Validate approval status and response timestamp
 */
export async function test_api_seller_approval_request_approve(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Seller setup - create seller connection and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: "seller1234",
      shop_name: RandomGenerator.name(2),
      shop_description: RandomGenerator.paragraph({ sentences: 3 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 3. Seller submits approval request
  const approvalRequest =
    await generate_random_shopping_mall_seller_seller_approval_requests_create(
      sellerConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 5 }),
        },
      },
    );
  typia.assert(approvalRequest);
  // Validate initial request status
  TestValidator.equals(
    "initial status is pending",
    approvalRequest.status,
    "pending",
  );
  TestValidator.equals(
    "responded_at is null initially",
    approvalRequest.responded_at,
    null,
  );
  // 4. Admin approves the request
  const approvedRequest =
    await api.functional.shoppingMall.admin.sellerApprovalRequests.update(
      adminConnection,
      {
        requestId: approvalRequest.id,
        body: {
          status: "approved",
        } satisfies IShoppingMallSellerApprovalRequest.IUpdate,
      },
    );
  typia.assert(approvedRequest);
  // 5. Validate approval results
  TestValidator.equals(
    "status changed to approved",
    approvedRequest.status,
    "approved",
  );
  TestValidator.predicate(
    "responded_at is set",
    approvedRequest.responded_at !== null,
  );
  TestValidator.equals(
    "seller matches original",
    approvedRequest.seller.id,
    approvalRequest.seller.id,
  );
  TestValidator.equals(
    "seller email matches",
    approvedRequest.seller.email,
    sellerEmail,
  );
}
