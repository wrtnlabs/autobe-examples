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
import { generate_random_shopping_mall_seller_seller_approval_requests_create } from "../../../generate/generate_random_shopping_mall_seller_seller_approval_requests_create";
import { prepare_random_shopping_mall_seller_approval_request } from "../../../prepare/prepare_random_shopping_mall_seller_approval_request";

export async function test_api_seller_approval_request_initial_submission_pending(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IShoppingMallSeller.IJoin;
  const join: IShoppingMallSeller.IAuthorized = await authorize_seller_join(
    sellerConnection,
    {
      body: joinBody,
    },
  );
  typia.assert(join);
  TestValidator.equals(
    "joined seller email matches registration input",
    join.email,
    joinBody.email,
  );
  TestValidator.notEquals(
    "joined seller is not immediately approved",
    join.approval_status,
    "approved",
  );
  TestValidator.equals(
    "joined seller rejection reason is initially null",
    join.rejection_reason,
    null,
  );
  TestValidator.equals("joined seller is not suspended", join.suspended, false);
  TestValidator.equals("joined seller is not banned", join.banned, false);
  const body = {
    reason: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IShoppingMallSellerApprovalRequest.ICreate;
  const approvalRequest: IShoppingMallSellerApprovalRequest =
    await generate_random_shopping_mall_seller_seller_approval_requests_create(
      sellerConnection,
      {
        body,
      },
    );
  typia.assert(approvalRequest);
  TestValidator.equals(
    "approval request belongs to authenticated seller",
    approvalRequest.seller.id,
    join.id,
  );
  TestValidator.equals(
    "approval request seller email matches authenticated seller",
    approvalRequest.seller.email,
    join.email,
  );
  TestValidator.equals(
    "approval request status starts pending",
    approvalRequest.status,
    "pending",
  );
  TestValidator.equals(
    "approval request preserves submitted reason",
    approvalRequest.reason,
    body.reason ?? null,
  );
  TestValidator.equals(
    "approval request reviewer is absent before review",
    approvalRequest.reviewer,
    null,
  );
  TestValidator.equals(
    "approval request reviewed_at is null before review",
    approvalRequest.reviewed_at,
    null,
  );
  TestValidator.notEquals(
    "seller summary still not approved after request submission",
    approvalRequest.seller.approval_status,
    "approved",
  );
}
