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

export async function test_api_seller_approval_request_review_retrieval(
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
  const authenticatedAdminConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${authorized.token.access}`,
    },
  };
  const review =
    await api.functional.shoppingMall.administrator.seller_approval_requests.reviews.at(
      authenticatedAdminConnection,
      {
        sellerApprovalRequestId: typia.random<string & tags.Format<"uuid">>(),
        sellerApprovalRequestReviewId: typia.random<
          string & tags.Format<"uuid">
        >(),
      },
    );
  typia.assert(review);
  typia.assert(review.sellerApprovalRequest);
  typia.assert(review.administrator);
  TestValidator.predicate(
    "seller approval request id should be present",
    review.sellerApprovalRequest.id.length > 0,
  );
  TestValidator.predicate(
    "seller approval request status should be present",
    review.sellerApprovalRequest.status.length > 0,
  );
  TestValidator.predicate(
    "review decision should be present",
    review.decision.length > 0,
  );
  TestValidator.predicate(
    "reviewedAt should be present",
    review.reviewedAt.length > 0,
  );
  TestValidator.predicate(
    "createdAt should be present",
    review.createdAt.length > 0,
  );
  TestValidator.predicate(
    "updatedAt should be present",
    review.updatedAt.length > 0,
  );
  TestValidator.predicate(
    "administrator id should be present",
    review.administrator.id.length > 0,
  );
  TestValidator.predicate(
    "administrator email should be present",
    review.administrator.email.length > 0,
  );
}
