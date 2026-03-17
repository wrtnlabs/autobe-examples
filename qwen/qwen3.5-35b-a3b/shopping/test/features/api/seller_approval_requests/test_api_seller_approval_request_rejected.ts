import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApprovalRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test seller approval request retrieval workflow.
 * 1. Seller registers and gets authentication
 * 2. Seller retrieves their approval request
 * 3. Validate approval request structure and seller information
 */
export async function test_api_seller_approval_request_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration with authorization
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(authorized);
  // 2. Create new connection with seller token for subsequent operations
  const sellerAuthenticatedConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: authorized.token.access },
  };
  // 3. Retrieve approval request to get ID and validate structure
  const approvalRequest =
    await api.functional.ecommerceMall.seller.approval_requests.at(
      sellerAuthenticatedConnection,
      {
        approvalRequestId: authorized.id,
      },
    );
  typia.assert(approvalRequest);
  // 4. Validate approval request structure and seller relationship
  TestValidator.equals(
    "approval request has UUID",
    approvalRequest.id,
    authorized.id,
  );
  TestValidator.equals(
    "seller reference matches",
    approvalRequest.seller.id,
    authorized.id,
  );
  TestValidator.equals(
    "seller email matches",
    approvalRequest.seller.email,
    authorized.email,
  );
  TestValidator.equals(
    "seller has status",
    approvalRequest.seller.status,
    "pending",
  );
  TestValidator.predicate(
    "approval request has seller",
    approvalRequest.seller !== null && approvalRequest.seller !== undefined,
  );
  TestValidator.equals(
    "approval request has status field",
    approvalRequest.status !== null && approvalRequest.status !== undefined,
    true,
  );
  TestValidator.equals(
    "approval request has timestamps",
    approvalRequest.created_at !== null && approvalRequest.updated_at !== null,
    true,
  );
}