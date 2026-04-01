import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerApprovalRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerApprovalRequestSnapshot";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerApprovalRequest";
import type { IShoppingMallSellerApprovalRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerApprovalRequestSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_approval_requests_create } from "../../../generate/generate_random_shopping_mall_seller_approval_requests_create";
import { prepare_random_shopping_mall_seller_approval_request } from "../../../prepare/prepare_random_shopping_mall_seller_approval_request";

/**
 * Test that a seller cannot retrieve snapshots of another seller's approval request.
 *
 * This test validates proper authorization and data isolation for seller approval
 * request snapshots. The test creates two seller accounts, creates an approval
 * request for the first seller, then attempts to access that approval request's
 * snapshots using the second seller's credentials. The system should reject this
 * request with an authorization error, confirming that sellers can only access
 * their own approval request snapshots.
 *
 * Test Flow:
 * 1. Register first seller account and create their approval request
 * 2. Register second seller account
 * 3. Attempt to access first seller's approval request snapshots as second seller
 * 4. Validate that the system rejects with authorization error
 */
export async function test_api_seller_approval_request_snapshot_access_denied(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first seller account
  const firstSellerConnection: api.IConnection = { host: connection.host };
  const firstSellerAuth = await authorize_seller_join(firstSellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(firstSellerAuth);
  // 2. Create first seller's approval request
  const approvalRequest =
    await generate_random_shopping_mall_seller_approval_requests_create(
      firstSellerConnection,
      {
        body: {},
      },
    );
  typia.assert(approvalRequest);
  // 3. Create second seller account (unauthorized user)
  const secondSellerConnection: api.IConnection = { host: connection.host };
  const secondSellerAuth = await authorize_seller_join(secondSellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(secondSellerAuth);
  // 4. Attempt to access first seller's approval request snapshots as second seller
  // This should fail with authorization error
  await TestValidator.error(
    "second seller cannot access first seller's approval request snapshots",
    async () => {
      await api.functional.shoppingMall.seller.approval_requests.snapshots.index(
        secondSellerConnection,
        {
          requestId: approvalRequest.id,
          body: {
            limit: 10,
          } satisfies IShoppingMallSellerApprovalRequestSnapshot.IRequest,
        },
      );
    },
  );
}
