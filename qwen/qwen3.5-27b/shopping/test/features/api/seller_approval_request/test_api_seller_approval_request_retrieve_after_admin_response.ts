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
 * Test that an administrator can retrieve a seller approval request after it has been submitted,
 * and verify the request details including status, timestamps, and seller information are correctly reflected.
 */
export async function test_api_seller_approval_request_retrieve_after_admin_response(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Register a seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    shop_name: RandomGenerator.name(2),
    shop_description: RandomGenerator.paragraph({ sentences: 3 }),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSeller.IJoin;
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: sellerJoinBody,
  });
  typia.assert(sellerAuth);
  // 3. Submit a seller approval request
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
  // 4. Retrieve the request as admin to verify it's accessible
  const retrievedRequest =
    await api.functional.shoppingMall.admin.seller_approval_requests.getByApprovalrequestid(
      adminConnection,
      {
        approvalRequestId: approvalRequest.id,
      },
    );
  typia.assert(retrievedRequest);
  // 5. Verify the retrieved request matches the created request
  TestValidator.equals(
    "request ID matches",
    retrievedRequest.id,
    approvalRequest.id,
  );
  TestValidator.equals(
    "seller ID matches",
    retrievedRequest.seller.id,
    sellerAuth.id,
  );
  TestValidator.equals(
    "reason preserved",
    retrievedRequest.reason,
    approvalRequest.reason,
  );
  TestValidator.equals("status is pending", retrievedRequest.status, "pending");
  TestValidator.equals(
    "responded_at is null for pending",
    retrievedRequest.responded_at,
    null,
  );
  TestValidator.equals(
    "submitted_at matches",
    retrievedRequest.submitted_at,
    approvalRequest.submitted_at,
  );
  TestValidator.equals(
    "created_at matches",
    retrievedRequest.created_at,
    approvalRequest.created_at,
  );
  TestValidator.equals(
    "updated_at matches",
    retrievedRequest.updated_at,
    approvalRequest.updated_at,
  );
  // 6. Verify seller information in the request
  TestValidator.equals(
    "seller email matches",
    retrievedRequest.seller.email,
    sellerJoinBody.email,
  );
  TestValidator.equals(
    "seller shop_name matches",
    retrievedRequest.seller.shop_name,
    sellerJoinBody.shop_name,
  );
  TestValidator.equals(
    "seller approval_status is pending",
    retrievedRequest.seller.approval_status,
    "pending",
  );
  // 7. Verify timestamps are valid
  TestValidator.predicate(
    "submitted_at is valid datetime",
    retrievedRequest.submitted_at.length > 0,
  );
  TestValidator.predicate(
    "created_at is valid datetime",
    retrievedRequest.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is valid datetime",
    retrievedRequest.updated_at.length > 0,
  );
  // 8. Verify deleted_at is null (request is not deleted)
  TestValidator.equals("deleted_at is null", retrievedRequest.deleted_at, null);
}
