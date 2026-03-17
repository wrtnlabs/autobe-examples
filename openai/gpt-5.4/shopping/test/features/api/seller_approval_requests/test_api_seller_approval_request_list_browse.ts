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

export async function test_api_seller_approval_request_list_browse(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert<IShoppingMallSeller.IAuthorized>(seller);
  const request = {
    page: 1,
    limit: 20,
    sort: "-created_at",
  } satisfies IShoppingMallSellerApprovalRequest.IRequest;
  const page =
    await api.functional.shoppingMall.seller.seller_approval_requests.index(
      sellerConnection,
      {
        body: request,
      },
    );
  typia.assert<IPageIShoppingMallSellerApprovalRequest.ISummary>(page);
  TestValidator.predicate(
    "pagination current is non-negative",
    page.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is non-negative",
    page.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    page.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    page.pagination.pages >= 0,
  );
  TestValidator.equals(
    "requested page is reflected",
    page.pagination.current,
    request.page,
  );
  TestValidator.equals(
    "requested limit is reflected",
    page.pagination.limit,
    request.limit,
  );
  for (const item of page.data) {
    typia.assert<IShoppingMallSellerApprovalRequest.ISummary>(item);
    TestValidator.predicate(
      "status is allowed workflow state",
      item.status === "pending" ||
        item.status === "approved" ||
        item.status === "rejected",
    );
    if (item.status === "pending") {
      TestValidator.equals(
        "pending item reviewer is null",
        item.reviewer,
        null,
      );
      TestValidator.equals(
        "pending item reviewed_at is null",
        item.reviewed_at,
        null,
      );
    } else if (item.reviewer !== null) {
      typia.assert<IShoppingMallAdministrator.ISummary>(item.reviewer);
    }
    typia.assert<IShoppingMallSeller.ISummary>(item.seller);
  }
}
