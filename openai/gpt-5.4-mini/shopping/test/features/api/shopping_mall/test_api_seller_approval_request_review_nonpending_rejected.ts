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
import { generate_random_shopping_mall_administrator_seller_approval_requests_reviews_create } from "../../../generate/generate_random_shopping_mall_administrator_seller_approval_requests_reviews_create";
import { prepare_random_shopping_mall_seller_approval_request_review } from "../../../prepare/prepare_random_shopping_mall_seller_approval_request_review";

export async function test_api_seller_approval_request_review_nonpending_rejected(
  connection: api.IConnection,
): Promise<void> {
  const administratorConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(administratorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallAdministrator.IJoin,
  });
  const firstReview =
    await generate_random_shopping_mall_administrator_seller_approval_requests_reviews_create(
      administratorConnection,
      {
        params: {
          sellerApprovalRequestId: typia.random<string & tags.Format<"uuid">>(),
        },
        body: {
          decision: "rejected",
          rejectionReason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IShoppingMallSellerApprovalRequestReview.ICreate,
      },
    );
  typia.assert(firstReview);
  const sellerApprovalRequestId = firstReview.sellerApprovalRequest.id;
  const sellerApprovalRequest =
    await api.functional.shoppingMall.administrator.seller_approval_requests.at(
      administratorConnection,
      {
        sellerApprovalRequestId,
      },
    );
  typia.assert(sellerApprovalRequest);
  TestValidator.notEquals(
    "seller approval request should not remain pending after review",
    sellerApprovalRequest.status,
    "pending",
  );
  await TestValidator.error(
    "second review on finalized seller approval request should be rejected",
    async () => {
      await generate_random_shopping_mall_administrator_seller_approval_requests_reviews_create(
        administratorConnection,
        {
          params: { sellerApprovalRequestId },
          body: {
            decision: "approved",
          } satisfies IShoppingMallSellerApprovalRequestReview.ICreate,
        },
      );
    },
  );
  const rereadRequest =
    await api.functional.shoppingMall.administrator.seller_approval_requests.at(
      administratorConnection,
      {
        sellerApprovalRequestId,
      },
    );
  typia.assert(rereadRequest);
  TestValidator.equals(
    "seller approval request should keep the original final status",
    rereadRequest.status,
    sellerApprovalRequest.status,
  );
  TestValidator.equals(
    "seller approval request rejection reason should be preserved",
    rereadRequest.rejectionReason,
    sellerApprovalRequest.rejectionReason,
  );
}
