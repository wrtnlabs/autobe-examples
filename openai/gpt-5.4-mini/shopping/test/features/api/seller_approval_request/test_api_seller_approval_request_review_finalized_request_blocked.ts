import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerApprovalRequest";
import type { IShoppingMallSellerApprovalRequestReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerApprovalRequestReview";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_shopping_mall_administrator_seller_approval_requests_reviews_process } from "../../../generate/generate_random_shopping_mall_administrator_seller_approval_requests_reviews_process";
import { prepare_random_shopping_mall_seller_approval_request_review } from "../../../prepare/prepare_random_shopping_mall_seller_approval_request_review";

export async function test_api_seller_approval_request_review_finalized_request_blocked(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  const administrator = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(administrator);
  const finalizedRequest =
    await generate_random_shopping_mall_administrator_seller_approval_requests_reviews_process(
      adminConnection,
      {
        params: {
          sellerApprovalRequestId: typia.random<string & tags.Format<"uuid">>(),
        },
        body: {
          decision: "approved",
        } satisfies IShoppingMallSellerApprovalRequestReview.ICreate,
      },
    );
  typia.assert(finalizedRequest);
  TestValidator.predicate(
    "seller approval request is finalized",
    finalizedRequest.status === "approved" ||
      finalizedRequest.status === "rejected",
  );
  await TestValidator.error(
    "finalized seller approval request cannot be reviewed again",
    async () => {
      await generate_random_shopping_mall_administrator_seller_approval_requests_reviews_process(
        adminConnection,
        {
          params: {
            sellerApprovalRequestId: finalizedRequest.id,
          },
          body: {
            decision:
              finalizedRequest.status === "approved" ? "rejected" : "approved",
            rejectionReason:
              finalizedRequest.status === "approved"
                ? RandomGenerator.paragraph({ sentences: 2 })
                : undefined,
          } satisfies IShoppingMallSellerApprovalRequestReview.ICreate,
        },
      );
    },
  );
}
