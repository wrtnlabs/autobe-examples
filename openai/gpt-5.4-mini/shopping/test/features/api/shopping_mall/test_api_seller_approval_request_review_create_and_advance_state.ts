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

export async function test_api_seller_approval_request_review_create_and_advance_state(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallAdministrator.IJoin,
  });
  typia.assert(authorized);
  const sellerApprovalRequestId: string = typia.random<
    string & tags.Format<"uuid">
  >();
  const sellerApprovalRequest =
    await api.functional.shoppingMall.administrator.seller_approval_requests.at(
      adminConnection,
      {
        sellerApprovalRequestId,
      },
    );
  typia.assert(sellerApprovalRequest);
  const review =
    await generate_random_shopping_mall_administrator_seller_approval_requests_reviews_create(
      adminConnection,
      {
        params: {
          sellerApprovalRequestId: sellerApprovalRequest.id,
        },
        body: {
          decision: "approved",
        } satisfies IShoppingMallSellerApprovalRequestReview.ICreate,
      },
    );
  typia.assert(review);
  TestValidator.equals(
    "review should belong to the fetched seller approval request",
    review.sellerApprovalRequest.id,
    sellerApprovalRequest.id,
  );
  TestValidator.equals(
    "review should belong to the authenticated administrator",
    review.administrator.id,
    authorized.id,
  );
  TestValidator.predicate(
    "review decision should be recorded",
    review.decision.length > 0,
  );
  TestValidator.predicate(
    "reviewed timestamp should be present",
    review.reviewedAt.length > 0,
  );
  const reloadedRequest =
    await api.functional.shoppingMall.administrator.seller_approval_requests.at(
      adminConnection,
      {
        sellerApprovalRequestId: sellerApprovalRequest.id,
      },
    );
  typia.assert(reloadedRequest);
  TestValidator.equals(
    "request id should remain stable after review creation",
    reloadedRequest.id,
    sellerApprovalRequest.id,
  );
}
