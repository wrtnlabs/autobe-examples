import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerApprovalRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_approval_requests_create } from "../../../generate/generate_random_shopping_mall_seller_approval_requests_create";
import { prepare_random_shopping_mall_seller_approval_request } from "../../../prepare/prepare_random_shopping_mall_seller_approval_request";

/**
 * Test the administrator's ability to retrieve a seller approval request.
 *
 * This test validates the complete workflow:
 * 1. Administrator creates account and logs in
 * 2. Seller creates account, logs in, and submits approval request
 * 3. Administrator retrieves the approval request by ID
 * 4. Validates response structure includes seller information, approval status, timestamps, and proper data types
 *
 * Note: The test retrieves the approval request after creation. The request will be in "pending" status
 * since no approval endpoint is available in the provided SDK. The test validates the retrieval
 * functionality and response structure integrity.
 */
export async function test_api_seller_approval_request_retrieval_approved(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup - create account and login
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  await authorize_administrator_join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_login(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IShoppingMallAdministrator.ILogin,
  });
  // 2. Seller setup - create account and login
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerJoin = await authorize_seller_join(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerJoin);
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ILogin,
  });
  // 3. Seller creates approval request
  const approvalRequest =
    await api.functional.shoppingMall.seller.approval_requests.create(
      sellerConnection,
      {
        body: {} satisfies IShoppingMallSellerApprovalRequest.ICreate,
      },
    );
  typia.assert(approvalRequest);
  // 4. Administrator retrieves the approval request
  const retrievedRequest =
    await api.functional.shoppingMall.administrator.approval_requests.at(
      adminConnection,
      {
        requestId: approvalRequest.id,
      },
    );
  typia.assert(retrievedRequest);
  // 5. Validate the retrieved request structure and data
  TestValidator.equals(
    "request ID matches",
    retrievedRequest.id,
    approvalRequest.id,
  );
  TestValidator.equals(
    "seller ID matches",
    retrievedRequest.seller.id,
    sellerJoin.id,
  );
  TestValidator.equals(
    "seller email matches",
    retrievedRequest.seller.email,
    sellerEmail,
  );
  TestValidator.predicate(
    "status is valid enum value",
    ["pending", "approved", "rejected"].includes(retrievedRequest.status),
  );
  TestValidator.predicate(
    "submitted_at is populated",
    retrievedRequest.submitted_at !== null &&
      retrievedRequest.submitted_at !== undefined,
  );
  TestValidator.predicate(
    "created_at is populated",
    retrievedRequest.created_at !== null &&
      retrievedRequest.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at is populated",
    retrievedRequest.updated_at !== null &&
      retrievedRequest.updated_at !== undefined,
  );
  TestValidator.predicate(
    "deleted_at is null for active request",
    retrievedRequest.deleted_at === null,
  );
  TestValidator.predicate(
    "reviewingAdministrator is null for pending request",
    retrievedRequest.reviewingAdministrator === null,
  );
  TestValidator.predicate(
    "rejection_reason is undefined for pending request",
    retrievedRequest.rejection_reason === undefined ||
      retrievedRequest.rejection_reason === null,
  );
}