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

export async function test_api_seller_approval_request_retrieval_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdministrator.IJoin,
  });
  // 2. Seller setup
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  // 3. Seller submits approval request
  const approvalRequest =
    await generate_random_shopping_mall_seller_approval_requests_create(
      sellerConnection,
      {
        body: {} satisfies IShoppingMallSellerApprovalRequest.ICreate,
      },
    );
  typia.assert(approvalRequest);
  TestValidator.equals("initial status", approvalRequest.status, "pending");
  // 4. Administrator rejects the approval request
  const rejectionReason = RandomGenerator.paragraph({ sentences: 2 });
  const rejectedRequest =
    await api.functional.shoppingMall.administrator.approval_requests.update(
      adminConnection,
      {
        requestId: approvalRequest.id,
        body: {
          status: "rejected",
          rejection_reason: rejectionReason,
        } satisfies IShoppingMallSellerApprovalRequest.IUpdate,
      },
    );
  typia.assert(rejectedRequest);
  TestValidator.equals("rejected status", rejectedRequest.status, "rejected");
  TestValidator.equals(
    "rejection reason",
    rejectedRequest.rejection_reason,
    rejectionReason,
  );
  TestValidator.predicate(
    "reviewed_at exists",
    rejectedRequest.reviewed_at !== null &&
      rejectedRequest.reviewed_at !== undefined,
  );
  TestValidator.predicate(
    "reviewing administrator exists",
    rejectedRequest.reviewingAdministrator !== null,
  );
  // 5. Administrator retrieves the rejected approval request
  const retrievedRequest =
    await api.functional.shoppingMall.administrator.approval_requests.at(
      adminConnection,
      {
        requestId: approvalRequest.id,
      },
    );
  typia.assert(retrievedRequest);
  // 6. Validate retrieved request contains all rejection information
  TestValidator.equals("retrieved status", retrievedRequest.status, "rejected");
  TestValidator.equals(
    "retrieved rejection reason",
    retrievedRequest.rejection_reason,
    rejectionReason,
  );
  TestValidator.predicate(
    "retrieved reviewed_at exists",
    retrievedRequest.reviewed_at !== null &&
      retrievedRequest.reviewed_at !== undefined,
  );
  TestValidator.predicate(
    "retrieved reviewing administrator exists",
    retrievedRequest.reviewingAdministrator !== null,
  );
  TestValidator.equals(
    "reviewing admin ID",
    retrievedRequest.reviewingAdministrator!.id,
    rejectedRequest.reviewingAdministrator!.id,
  );
  TestValidator.equals(
    "reviewing admin email",
    retrievedRequest.reviewingAdministrator!.email,
    rejectedRequest.reviewingAdministrator!.email,
  );
}
