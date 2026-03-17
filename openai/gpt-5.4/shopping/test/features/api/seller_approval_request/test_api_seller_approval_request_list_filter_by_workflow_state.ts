import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerApprovalRequest";
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

export async function test_api_seller_approval_request_list_filter_by_workflow_state(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = {
    host: connection.host,
  };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  const pendingFilter = {
    page: 1,
    limit: 10,
    status: "pending",
  } satisfies IShoppingMallSellerApprovalRequest.IRequest;
  await TestValidator.error(
    "seller cannot list pending approval requests",
    async () => {
      await api.functional.shoppingMall.seller.seller_approval_requests.index(
        sellerConnection,
        {
          body: pendingFilter,
        },
      );
    },
  );
  const reviewedStatuses = ["approved", "rejected"] as const;
  const reviewedFilter = {
    page: 1,
    limit: 10,
    status: RandomGenerator.pick(reviewedStatuses),
    shopping_mall_administrator_id: typia.random<
      string & tags.Format<"uuid">
    >(),
    reviewed_at_from: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    reviewed_at_to: new Date().toISOString(),
  } satisfies IShoppingMallSellerApprovalRequest.IRequest;
  await TestValidator.error(
    "seller cannot list reviewed approval requests by reviewer and reviewed_at range",
    async () => {
      await api.functional.shoppingMall.seller.seller_approval_requests.index(
        sellerConnection,
        {
          body: reviewedFilter,
        },
      );
    },
  );
}
