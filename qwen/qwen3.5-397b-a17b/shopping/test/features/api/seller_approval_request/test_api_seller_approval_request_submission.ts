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

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_approval_requests_create } from "../../../generate/generate_random_shopping_mall_seller_approval_requests_create";
import { prepare_random_shopping_mall_seller_approval_request } from "../../../prepare/prepare_random_shopping_mall_seller_approval_request";

export async function test_api_seller_approval_request_submission(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller connection and authenticate via seller join
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth: IShoppingMallSeller.IAuthorized =
    await authorize_seller_join(sellerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IShoppingMallSeller.IJoin,
    });
  typia.assert(sellerAuth);
  // 2. Submit seller approval request using utility function
  const approvalRequest: IShoppingMallSellerApprovalRequest =
    await generate_random_shopping_mall_seller_approval_requests_create(
      sellerConnection,
      {
        body: {} satisfies IShoppingMallSellerApprovalRequest.ICreate,
      },
    );
  typia.assert(approvalRequest);
  // 3. Verify approval request status is 'pending'
  TestValidator.equals(
    "approval status is pending",
    approvalRequest.status,
    "pending",
  );
  // 4. Verify rejection_reason is null (no rejection yet)
  TestValidator.equals(
    "rejection_reason is null",
    approvalRequest.rejection_reason,
    null,
  );
  // 5. Verify seller information is correctly associated
  TestValidator.equals(
    "seller id matches",
    approvalRequest.seller.id,
    sellerAuth.id,
  );
  // 6. Verify reviewingAdministrator is null (not yet reviewed)
  TestValidator.equals(
    "reviewingAdministrator is null",
    approvalRequest.reviewingAdministrator,
    null,
  );
  // 7. Verify deleted_at is null (active record)
  TestValidator.equals("deleted_at is null", approvalRequest.deleted_at, null);
}
