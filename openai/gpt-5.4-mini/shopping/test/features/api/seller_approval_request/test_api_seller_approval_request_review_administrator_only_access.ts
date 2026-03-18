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

export async function test_api_seller_approval_request_review_administrator_only_access(
  connection: api.IConnection,
): Promise<void> {
  const administratorConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_administrator_join(
    administratorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IShoppingMallAdministrator.IJoin,
    },
  );
  typia.assert(authorized);
  const pendingRequest =
    await api.functional.shoppingMall.administrator.seller_approval_requests.at(
      administratorConnection,
      {
        sellerApprovalRequestId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(pendingRequest);
  const review =
    await generate_random_shopping_mall_administrator_seller_approval_requests_reviews_create(
      administratorConnection,
      {
        params: {
          sellerApprovalRequestId: pendingRequest.id,
        },
        body: {
          decision: "approved",
        } satisfies IShoppingMallSellerApprovalRequestReview.ICreate,
      },
    );
  typia.assert(review);
  TestValidator.equals(
    "review is linked to the same seller approval request",
    review.sellerApprovalRequest.id,
    pendingRequest.id,
  );
  TestValidator.equals(
    "review is attributed to the authenticated administrator",
    review.administrator.id,
    authorized.id,
  );
  TestValidator.equals(
    "request status is updated by the review decision",
    review.sellerApprovalRequest.status,
    "approved",
  );
  const nonAdministratorConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "non-administrator cannot create seller approval request review",
    async () => {
      await api.functional.shoppingMall.administrator.seller_approval_requests.reviews.create(
        nonAdministratorConnection,
        {
          sellerApprovalRequestId: pendingRequest.id,
          body: {
            decision: "approved",
          } satisfies IShoppingMallSellerApprovalRequestReview.ICreate,
        },
      );
    },
  );
}
