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

export async function test_api_customer_review_history_sorted(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer account
  const joinConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      name: RandomGenerator.name(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  // 2. Login as customer to get authentication token
  const loginConnection: api.IConnection = { host: connection.host };
  await authorize_customer_login(loginConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
    } satisfies IShoppingMallCustomer.ILogin,
  });
  // 3. Verify that customer can retrieve their review history with pagination
  const reviews =
    await api.functional.shoppingMall.customer.reviews.me.at(loginConnection);
  typia.assert(reviews);
  // 4. Validate pagination structure
  TestValidator.equals("pagination exists", reviews.pagination.current, 1);
  TestValidator.predicate(
    "pagination limit positive",
    reviews.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    reviews.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    reviews.pagination.pages >= 0,
  );
  // 5. Validate reviews array structure
  TestValidator.equals("reviews array type", Array.isArray(reviews.data), true);
  // 6. Validate reviews data exists when records > 0
  if (reviews.pagination.records > 0) {
    TestValidator.predicate(
      "data matches records count",
      reviews.data.length > 0,
    );
  }
}
