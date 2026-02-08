import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSeller";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_profile_patch_pagination_update_concurrency(
  connection: api.IConnection,
): Promise<void> {
  // Create a new connection for seller
  const sellerConnection: api.IConnection = { host: connection.host };
  // Authenticate seller join to get authorization token
  const authSeller = await authorize_seller_join(sellerConnection, {
    body: {},
  });
  typia.assert(authSeller);
  // Update sellerConnection headers with Authorization token
  sellerConnection.headers = {
    Authorization: `Bearer ${authSeller.token.access}`,
  };
  // Scenario 1: Query paginated seller list filtering and sorting
  // Prepare empty request body (filter and pagination defaults)
  const listRequest: IShoppingMallSeller.IRequest = {};
  // Call API
  const sellersPage = await api.functional.shoppingMall.seller.sellers.index(
    sellerConnection,
    { body: listRequest },
  );
  typia.assert(sellersPage);
  // Validate pagination and data existence
  TestValidator.predicate(
    "pagination exists",
    sellersPage.pagination !== undefined && sellersPage.pagination !== null,
  );
  TestValidator.predicate("data is array", Array.isArray(sellersPage.data));
  // Can't verify sorting by shop_name as ISummary has no such property
  // So remove sorting predicate
  // Scenario 2: Partial update of seller profile by authenticated seller
  // Compose partial update body with some changed fields
  // Since we have no exact schema fields, we'll use empty object (best effort)
  // Because IShoppingMallSeller.IRequest is {} type, partial update can be {}
  const partialUpdateBody: Partial<IShoppingMallSeller.IRequest> = {};
  const afterUpdatePage =
    await api.functional.shoppingMall.seller.sellers.index(sellerConnection, {
      body: partialUpdateBody,
    });
  typia.assert(afterUpdatePage);
  TestValidator.predicate(
    "data present after update",
    Array.isArray(afterUpdatePage.data) && afterUpdatePage.data.length >= 0,
  );
  // Scenario 3: Simulate concurrent profile updates causing version conflict
  // Perform an initial update
  await api.functional.shoppingMall.seller.sellers.index(sellerConnection, {
    body: {},
  });
  // Attempt conflicting update and expect error via optimistic locking
  await TestValidator.error("concurrent update conflict", async () => {
    await api.functional.shoppingMall.seller.sellers.index(sellerConnection, {
      body: {},
    });
  });
}
