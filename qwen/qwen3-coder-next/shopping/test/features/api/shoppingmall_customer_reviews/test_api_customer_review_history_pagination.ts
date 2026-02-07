import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReview";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_review_history_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer account
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResponse = await authorize_customer_join(joinConnection, {
    body: typia.random<IShoppingMallCustomer.IJoin>(),
  });
  typia.assert(joinResponse);
  // 2. Login as customer
  const loginConnection: api.IConnection = { host: connection.host };
  await authorize_customer_login(loginConnection, {
    body: typia.random<IShoppingMallCustomer.ILogin>(),
  });
  // 3. Fetch review history
  const reviews =
    await api.functional.shoppingMall.customer.reviews.me.at(loginConnection);
  typia.assert<IPageIShoppingMallReview>(reviews);
  // 4. Validate pagination structure
  typia.assert<IPage.IPagination>(reviews.pagination);
  TestValidator.equals(
    "current page >= 1",
    reviews.pagination.current >= 1,
    true,
  );
  TestValidator.equals("limit > 0", reviews.pagination.limit > 0, true);
  TestValidator.equals("records >= 0", reviews.pagination.records >= 0, true);
  TestValidator.equals("pages >= 0", reviews.pagination.pages >= 0, true);
  // 5. Validate reviews data array
  typia.assert<IShoppingMallReview[]>(reviews.data);
  TestValidator.predicate("data is array", Array.isArray(reviews.data));
}
