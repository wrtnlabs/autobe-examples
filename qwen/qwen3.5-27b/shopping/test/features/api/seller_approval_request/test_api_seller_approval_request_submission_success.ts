import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerApprovalRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_seller_approval_requests_create } from "../../../generate/generate_random_shopping_mall_seller_seller_approval_requests_create";
import { prepare_random_shopping_mall_seller_approval_request } from "../../../prepare/prepare_random_shopping_mall_seller_approval_request";

/**
 * Test the primary success path where a newly registered seller submits their first approval request to join the platform.
 *
 * Workflow:
 * 1. Create seller connection and register a new seller account
 * 2. Submit seller approval request with valid reason
 * 3. Validate the approval request response structure and business logic
 */
export async function test_api_seller_approval_request_submission_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create seller connection and register new seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(2),
      shop_description: RandomGenerator.paragraph({ sentences: 3 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(seller);
  // Verify seller was created with pending approval status
  TestValidator.equals(
    "seller approval status is pending",
    seller.approval_status,
    "pending",
  );
  TestValidator.equals(
    "seller account status is active",
    seller.status,
    "active",
  );
  // 2. Execution: Submit seller approval request
  const approvalRequest =
    await generate_random_shopping_mall_seller_seller_approval_requests_create(
      sellerConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(approvalRequest);
  // 3. Validation: Verify approval request structure
  TestValidator.equals(
    "approval request has valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      approvalRequest.id,
    ),
    true,
  );
  TestValidator.equals(
    "approval request status is pending",
    approvalRequest.status,
    "pending",
  );
  TestValidator.equals(
    "responded_at is null",
    approvalRequest.responded_at,
    null,
  );
  TestValidator.equals("deleted_at is null", approvalRequest.deleted_at, null);
  // Validate seller summary in approval request
  TestValidator.equals(
    "seller ID matches",
    approvalRequest.seller.id,
    seller.id,
  );
  TestValidator.equals(
    "seller email matches",
    approvalRequest.seller.email,
    seller.email,
  );
  TestValidator.equals(
    "seller shop_name matches",
    approvalRequest.seller.shop_name,
    seller.shop_name,
  );
  TestValidator.equals(
    "seller approval_status is pending",
    approvalRequest.seller.approval_status,
    "pending",
  );
  TestValidator.equals(
    "seller status is active",
    approvalRequest.seller.status,
    "active",
  );
  // Validate timestamps
  TestValidator.predicate(
    "submitted_at is valid ISO 8601 timestamp",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,9})?(Z|[+-]\d{2}:\d{2})$/.test(
      approvalRequest.submitted_at,
    ),
  );
  TestValidator.predicate(
    "created_at is valid ISO 8601 timestamp",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,9})?(Z|[+-]\d{2}:\d{2})$/.test(
      approvalRequest.created_at,
    ),
  );
  TestValidator.predicate(
    "updated_at is valid ISO 8601 timestamp",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,9})?(Z|[+-]\d{2}:\d{2})$/.test(
      approvalRequest.updated_at,
    ),
  );
  // Validate reason is non-empty
  TestValidator.predicate(
    "reason is non-empty",
    approvalRequest.reason.length >= 1,
  );
}
