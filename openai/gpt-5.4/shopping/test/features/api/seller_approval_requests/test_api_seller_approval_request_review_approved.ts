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

export async function test_api_seller_approval_request_review_approved(
  connection: api.IConnection,
): Promise<void> {
  const administratorJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IShoppingMallAdministrator.IJoin;
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IShoppingMallSeller.IJoin;
  const administratorConnection: api.IConnection = { host: connection.host };
  const administratorAuthorized = await authorize_administrator_join(
    administratorConnection,
    {
      body: administratorJoinBody,
    },
  );
  typia.assert(administratorAuthorized);
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {
    body: sellerJoinBody,
  });
  typia.assert(sellerAuthorized);
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  const sellerLoginBody = {
    email: sellerJoinBody.email,
    password: sellerJoinBody.password,
    href: sellerJoinBody.href,
    referrer: sellerJoinBody.referrer,
    ip: sellerJoinBody.ip,
  } satisfies IShoppingMallSeller.ILogin;
  const sellerLoggedIn = await authorize_seller_login(sellerLoginConnection, {
    body: sellerLoginBody,
  });
  typia.assert(sellerLoggedIn);
  const submissionReason = RandomGenerator.paragraph({ sentences: 3 });
  const createBody = {
    reason: submissionReason,
  } satisfies IShoppingMallSellerApprovalRequest.ICreate;
  const created =
    await generate_random_shopping_mall_seller_seller_approval_requests_create(
      sellerLoginConnection,
      {
        body: createBody,
      },
    );
  typia.assert(created);
  TestValidator.equals(
    "created request status is pending",
    created.status,
    "pending",
  );
  TestValidator.equals(
    "created request reviewed_at is null",
    created.reviewed_at,
    null,
  );
  TestValidator.equals(
    "created request reviewer is null",
    created.reviewer,
    null,
  );
  TestValidator.equals(
    "created request seller id matches joined seller",
    created.seller.id,
    sellerAuthorized.id,
  );
  TestValidator.equals(
    "created request seller email matches joined seller",
    created.seller.email,
    sellerJoinBody.email,
  );
  TestValidator.equals(
    "created request seller approval status is pending",
    created.seller.approval_status,
    "pending",
  );
  TestValidator.equals(
    "created request reason matches submission",
    created.reason,
    submissionReason,
  );
  const administratorLoginConnection: api.IConnection = {
    host: connection.host,
  };
  const administratorLoginBody = {
    email: administratorJoinBody.email,
    password: administratorJoinBody.password,
    href: administratorJoinBody.href,
    referrer: administratorJoinBody.referrer,
    ip: administratorJoinBody.ip,
  } satisfies IShoppingMallAdministrator.ILogin;
  const administratorLoggedIn = await authorize_administrator_login(
    administratorLoginConnection,
    {
      body: administratorLoginBody,
    },
  );
  typia.assert(administratorLoggedIn);
  const approved =
    await api.functional.shoppingMall.administrator.seller_approval_requests.update(
      administratorLoginConnection,
      {
        sellerApprovalRequestId: created.id,
        body: {
          status: "approved",
          reason: null,
        } satisfies IShoppingMallSellerApprovalRequest.IUpdate,
      },
    );
  typia.assert(approved);
  TestValidator.equals(
    "approved request status is approved",
    approved.status,
    "approved",
  );
  TestValidator.predicate(
    "approved request reviewed_at is populated",
    approved.reviewed_at !== null,
  );
  TestValidator.predicate(
    "approved request reviewer is populated",
    approved.reviewer !== null,
  );
  if (approved.reviewer !== null) {
    TestValidator.equals(
      "approved request reviewer id matches acting administrator",
      approved.reviewer.id,
      administratorAuthorized.id,
    );
    TestValidator.equals(
      "approved request reviewer email matches acting administrator",
      approved.reviewer.email,
      administratorJoinBody.email,
    );
  }
  TestValidator.equals(
    "approved request seller id remains same",
    approved.seller.id,
    sellerAuthorized.id,
  );
  TestValidator.equals(
    "approved request seller email remains same",
    approved.seller.email,
    sellerJoinBody.email,
  );
  TestValidator.equals(
    "approved request seller approval status becomes approved",
    approved.seller.approval_status,
    "approved",
  );
  TestValidator.equals(
    "approved request seller rejection reason remains null",
    approved.seller.rejection_reason,
    null,
  );
  TestValidator.equals(
    "approved request reason does not rely on rejection reason",
    approved.reason,
    null,
  );
  TestValidator.notEquals(
    "review timestamp changed from pending null state",
    approved.reviewed_at,
    created.reviewed_at,
  );
  TestValidator.notEquals(
    "request updated_at changes after approval",
    approved.updated_at,
    created.updated_at,
  );
}
