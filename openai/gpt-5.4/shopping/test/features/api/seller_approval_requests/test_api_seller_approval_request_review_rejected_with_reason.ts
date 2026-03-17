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

export async function test_api_seller_approval_request_review_rejected_with_reason(
  connection: api.IConnection,
): Promise<void> {
  const administratorConnection: api.IConnection = {
    host: connection.host,
  };
  const administratorEmail = typia.random<string & tags.Format<"email">>();
  const administratorJoin = await authorize_administrator_join(
    administratorConnection,
    {
      body: {
        email: administratorEmail,
        password: typia.random<string & tags.Format<"password">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: undefined,
      } satisfies IShoppingMallAdministrator.IJoin,
    },
  );
  typia.assert(administratorJoin);
  const sellerConnection: api.IConnection = {
    host: connection.host,
  };
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerJoin = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerJoin);
  const submissionReason = RandomGenerator.paragraph({ sentences: 3 });
  const pendingRequest =
    await generate_random_shopping_mall_seller_seller_approval_requests_create(
      sellerConnection,
      {
        body: {
          reason: submissionReason,
        } satisfies IShoppingMallSellerApprovalRequest.ICreate,
      },
    );
  typia.assert(pendingRequest);
  TestValidator.equals(
    "seller approval request starts pending",
    pendingRequest.status,
    "pending",
  );
  TestValidator.equals(
    "pending request belongs to seller",
    pendingRequest.seller.id,
    sellerJoin.id,
  );
  const rejectionReason = RandomGenerator.paragraph({ sentences: 4 });
  const reviewBody = {
    status: "rejected",
    reason: rejectionReason,
  } satisfies IShoppingMallSellerApprovalRequest.IUpdate;
  const reviewedRequest =
    await api.functional.shoppingMall.administrator.seller_approval_requests.update(
      administratorConnection,
      {
        sellerApprovalRequestId: pendingRequest.id,
        body: reviewBody,
      },
    );
  typia.assert(reviewedRequest);
  TestValidator.equals(
    "request status becomes rejected",
    reviewedRequest.status,
    "rejected",
  );
  TestValidator.equals(
    "rejection reason is preserved on request",
    reviewedRequest.reason,
    rejectionReason,
  );
  TestValidator.predicate(
    "reviewed_at is recorded after rejection",
    reviewedRequest.reviewed_at !== null,
  );
  TestValidator.predicate(
    "reviewer is recorded after rejection",
    reviewedRequest.reviewer !== null,
  );
  TestValidator.equals(
    "reviewer id matches acting administrator",
    reviewedRequest.reviewer?.id ?? null,
    administratorJoin.id,
  );
  TestValidator.equals(
    "reviewer email matches acting administrator",
    reviewedRequest.reviewer?.email ?? null,
    administratorJoin.email,
  );
  TestValidator.equals(
    "reviewed request still belongs to the seller",
    reviewedRequest.seller.id,
    sellerJoin.id,
  );
  TestValidator.equals(
    "seller summary email matches seller account",
    reviewedRequest.seller.email,
    sellerJoin.email,
  );
  TestValidator.equals(
    "seller approval standing becomes rejected",
    reviewedRequest.seller.approval_status,
    "rejected",
  );
  TestValidator.notEquals(
    "seller does not become approved after rejection",
    reviewedRequest.seller.approval_status,
    "approved",
  );
  TestValidator.equals(
    "seller rejection reason is visible in seller summary",
    reviewedRequest.seller.rejection_reason,
    rejectionReason,
  );
}
