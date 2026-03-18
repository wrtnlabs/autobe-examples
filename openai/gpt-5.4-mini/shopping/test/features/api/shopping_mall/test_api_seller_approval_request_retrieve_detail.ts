import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerApprovalRequest";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_seller_approval_request_retrieve_detail(
  connection: api.IConnection,
): Promise<void> {
  const administratorConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(administratorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallAdministrator.IJoin,
  });
  const sellerApprovalRequestId = typia.random<string & tags.Format<"uuid">>();
  const request =
    await api.functional.shoppingMall.administrator.seller_approval_requests.at(
      administratorConnection,
      { sellerApprovalRequestId },
    );
  typia.assert(request);
  TestValidator.equals(
    "seller approval request id",
    request.id,
    sellerApprovalRequestId,
  );
  TestValidator.predicate(
    "seller relation is present",
    request.seller.id.length > 0,
  );
  TestValidator.predicate(
    "seller approval request status is present",
    request.status.length > 0,
  );
  TestValidator.predicate(
    "created timestamp is present",
    request.createdAt.length > 0,
  );
  TestValidator.predicate(
    "updated timestamp is present",
    request.updatedAt.length > 0,
  );
}
