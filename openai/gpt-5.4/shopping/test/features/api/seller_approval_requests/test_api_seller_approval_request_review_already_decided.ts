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

export async function test_api_seller_approval_request_review_already_decided(
  connection: api.IConnection,
): Promise<void> {
  const administratorEmail = typia.random<string & tags.Format<"email">>();
  const administratorPassword = typia.random<
    string & tags.Format<"password">
  >();
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = typia.random<string & tags.Format<"password">>();
  const administratorJoinConnection: api.IConnection = {
    host: connection.host,
  };
  const administrator = await authorize_administrator_join(
    administratorJoinConnection,
    {
      body: {
        email: administratorEmail,
        password: administratorPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    },
  );
  typia.assert(administrator);
  const sellerJoinConnection: api.IConnection = {
    host: connection.host,
  };
  const seller = await authorize_seller_join(sellerJoinConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(seller);
  const sellerApprovalRequest =
    await generate_random_shopping_mall_seller_seller_approval_requests_create(
      sellerJoinConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(sellerApprovalRequest);
  TestValidator.equals(
    "created request belongs to seller",
    sellerApprovalRequest.seller.id,
    seller.id,
  );
  TestValidator.equals(
    "created request has no reviewer yet",
    sellerApprovalRequest.reviewer,
    null,
  );
  TestValidator.equals(
    "created request has no reviewed_at yet",
    sellerApprovalRequest.reviewed_at,
    null,
  );
  const administratorLoginConnection: api.IConnection = {
    host: connection.host,
  };
  const administratorLogin = await authorize_administrator_login(
    administratorLoginConnection,
    {
      body: {
        email: administratorEmail,
        password: administratorPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    },
  );
  typia.assert(administratorLogin);
  const firstDecisionBody = {
    status: "approved",
    reason: null,
  } satisfies IShoppingMallSellerApprovalRequest.IUpdate;
  const firstDecision =
    await api.functional.shoppingMall.administrator.seller_approval_requests.update(
      administratorLoginConnection,
      {
        sellerApprovalRequestId: sellerApprovalRequest.id,
        body: firstDecisionBody,
      },
    );
  typia.assert(firstDecision);
  TestValidator.equals(
    "same approval request id after first decision",
    firstDecision.id,
    sellerApprovalRequest.id,
  );
  TestValidator.notEquals(
    "request is no longer pending after first decision",
    firstDecision.status,
    sellerApprovalRequest.status,
  );
  TestValidator.equals(
    "reviewed seller remains the original seller",
    firstDecision.seller.id,
    seller.id,
  );
  TestValidator.equals(
    "reviewed request seller matches created request seller",
    firstDecision.seller.id,
    sellerApprovalRequest.seller.id,
  );
  TestValidator.predicate(
    "reviewed_at exists after first decision",
    firstDecision.reviewed_at !== null,
  );
  TestValidator.predicate(
    "reviewer exists after first decision",
    firstDecision.reviewer !== null,
  );
  TestValidator.equals(
    "first decision status is approved",
    firstDecision.status,
    "approved",
  );
  TestValidator.equals(
    "first decision reason remains null for approval",
    firstDecision.reason,
    null,
  );
  await TestValidator.httpError(
    "second review attempt is rejected after request already decided",
    [400, 409, 422],
    async () => {
      await api.functional.shoppingMall.administrator.seller_approval_requests.update(
        administratorLoginConnection,
        {
          sellerApprovalRequestId: sellerApprovalRequest.id,
          body: {
            status: "rejected",
            reason: RandomGenerator.paragraph({ sentences: 2 }),
          } satisfies IShoppingMallSellerApprovalRequest.IUpdate,
        },
      );
    },
  );
  TestValidator.equals(
    "authoritative decision status stays approved in snapshot",
    firstDecision.status,
    "approved",
  );
  TestValidator.equals(
    "authoritative decision reason stays null in snapshot",
    firstDecision.reason,
    null,
  );
  TestValidator.equals(
    "authoritative decision request id stays unchanged",
    firstDecision.id,
    sellerApprovalRequest.id,
  );
}
