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
import { generate_random_shopping_mall_seller_seller_approval_requests_create } from "../../../generate/generate_random_shopping_mall_seller_seller_approval_requests_create";
import { prepare_random_shopping_mall_seller_approval_request } from "../../../prepare/prepare_random_shopping_mall_seller_approval_request";

export async function test_api_seller_approval_request_detail_rejected_reason_visible(
  connection: api.IConnection,
): Promise<void> {
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = typia.random<string & tags.Format<"password">>();
  const sellerHref = typia.random<string & tags.Format<"uri">>();
  const sellerReferrer = typia.random<string & tags.Format<"uri">>();
  const sellerJoinBody = {
    email: sellerEmail,
    password: sellerPassword,
    href: sellerHref,
    referrer: sellerReferrer,
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IShoppingMallSeller.IJoin;
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerJoinConnection, {
    body: sellerJoinBody,
  });
  typia.assert(sellerAuth);
  const submissionReason = RandomGenerator.paragraph({ sentences: 4 });
  const createdRequest =
    await generate_random_shopping_mall_seller_seller_approval_requests_create(
      sellerJoinConnection,
      {
        body: {
          reason: submissionReason,
        },
      },
    );
  typia.assert(createdRequest);
  const administratorEmail = typia.random<string & tags.Format<"email">>();
  const administratorPassword = typia.random<
    string & tags.Format<"password">
  >();
  const administratorHref = typia.random<string & tags.Format<"uri">>();
  const administratorReferrer = typia.random<string & tags.Format<"uri">>();
  const administratorJoinBody = {
    email: administratorEmail,
    password: administratorPassword,
    href: administratorHref,
    referrer: administratorReferrer,
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IShoppingMallAdministrator.IJoin;
  const administratorJoinConnection: api.IConnection = {
    host: connection.host,
  };
  const administratorAuth = await authorize_administrator_join(
    administratorJoinConnection,
    {
      body: administratorJoinBody,
    },
  );
  typia.assert(administratorAuth);
  const rejectedStatus = "rejected";
  const rejectionReason = RandomGenerator.paragraph({ sentences: 6 });
  const reviewBody = {
    status: rejectedStatus,
    reason: rejectionReason,
  } satisfies IShoppingMallSellerApprovalRequest.IUpdate;
  const reviewedRequest =
    await api.functional.shoppingMall.administrator.seller_approval_requests.update(
      administratorJoinConnection,
      {
        sellerApprovalRequestId: createdRequest.id,
        body: reviewBody,
      },
    );
  typia.assert(reviewedRequest);
  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerPassword,
    href: sellerHref,
    referrer: sellerReferrer,
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IShoppingMallSeller.ILogin;
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  const sellerLoggedIn = await authorize_seller_login(sellerLoginConnection, {
    body: sellerLoginBody,
  });
  typia.assert(sellerLoggedIn);
  const detail =
    await api.functional.shoppingMall.seller.seller_approval_requests.at(
      sellerLoginConnection,
      {
        sellerApprovalRequestId: createdRequest.id,
      },
    );
  typia.assert(detail);
  TestValidator.equals(
    "detail id matches request",
    detail.id,
    createdRequest.id,
  );
  TestValidator.equals(
    "detail status matches reviewed status",
    detail.status,
    reviewedRequest.status,
  );
  TestValidator.equals(
    "detail reason exposes rejection reason",
    detail.reason,
    rejectionReason,
  );
  TestValidator.equals(
    "review response reason matches rejection reason",
    reviewedRequest.reason,
    rejectionReason,
  );
  TestValidator.predicate(
    "detail reviewed_at exists after rejection",
    detail.reviewed_at !== null,
  );
  TestValidator.predicate(
    "review response reviewed_at exists after rejection",
    reviewedRequest.reviewed_at !== null,
  );
  TestValidator.predicate(
    "detail reviewer exists after rejection",
    detail.reviewer !== null,
  );
  TestValidator.predicate(
    "review response reviewer exists after rejection",
    reviewedRequest.reviewer !== null,
  );
  TestValidator.equals(
    "detail seller id matches owner",
    detail.seller.id,
    sellerAuth.id,
  );
  TestValidator.equals(
    "detail seller email matches owner",
    detail.seller.email,
    sellerAuth.email,
  );
  if (detail.reviewer !== null && reviewedRequest.reviewer !== null) {
    TestValidator.equals(
      "detail reviewer id matches reviewing administrator",
      detail.reviewer.id,
      administratorAuth.id,
    );
    TestValidator.equals(
      "detail reviewer email matches reviewing administrator",
      detail.reviewer.email,
      administratorAuth.email,
    );
    TestValidator.equals(
      "detail reviewer matches review response reviewer",
      detail.reviewer,
      reviewedRequest.reviewer,
    );
  }
  TestValidator.equals(
    "detail seller summary matches review response seller summary",
    detail.seller,
    reviewedRequest.seller,
  );
  TestValidator.equals(
    "detail matches reviewed result state",
    {
      status: detail.status,
      reason: detail.reason,
      reviewed_at: detail.reviewed_at,
      seller: detail.seller,
      reviewer: detail.reviewer,
    },
    {
      status: reviewedRequest.status,
      reason: reviewedRequest.reason,
      reviewed_at: reviewedRequest.reviewed_at,
      seller: reviewedRequest.seller,
      reviewer: reviewedRequest.reviewer,
    },
  );
  const detailAgain =
    await api.functional.shoppingMall.seller.seller_approval_requests.at(
      sellerLoginConnection,
      {
        sellerApprovalRequestId: createdRequest.id,
      },
    );
  typia.assert(detailAgain);
  TestValidator.equals(
    "repeated detail retrieval is read only",
    detailAgain,
    detail,
  );
}
