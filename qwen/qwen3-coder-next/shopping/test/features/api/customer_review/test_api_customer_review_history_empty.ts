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

export async function test_api_customer_review_history_empty(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer account
  const joinConnection: api.IConnection = { host: connection.host };
  const joinInput = typia.random<IShoppingMallCustomer.IJoin>();
  await authorize_customer_join(joinConnection, {
    body: joinInput,
  });
  // 2. Login as customer to get authentication token
  const loginConnection: api.IConnection = { host: connection.host };
  const loginInput = typia.random<IShoppingMallCustomer.ILogin>();
  await authorize_customer_login(loginConnection, {
    body: loginInput,
  });
  // 3. Get customer review history (should be empty)
  const output: IPageIShoppingMallReview =
    await api.functional.shoppingMall.customer.reviews.me.at(loginConnection);
  typia.assert(output);
  // 4. Validate pagination structure and empty results
  TestValidator.equals("pagination exists", output.pagination.current, 1);
  TestValidator.equals(
    "pagination has limit",
    output.pagination.limit > 0,
    true,
  );
  TestValidator.equals("pagination records is 0", output.pagination.records, 0);
  TestValidator.equals("pagination pages is 0", output.pagination.pages, 0);
  TestValidator.equals("data array is empty", output.data.length, 0);
  TestValidator.equals("data array is empty array", output.data, []);
}
