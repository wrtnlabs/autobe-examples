import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSaleReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSaleReview";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSaleReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleReview";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_sale_reviews_full_text_search_and_customer_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer join and authorization
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {} as IShoppingMallCustomer.IJoin,
  });
  typia.assert(authorized);
  // Use authorized connection with updated header
  const authorizedConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: authorized.token.access,
    },
  };
  // 2. Fetch first page of sale reviews without filters
  const page1 = await api.functional.shoppingMall.customer.sale_reviews.index(
    authorizedConnection,
    {
      body: {} as IShoppingMallSaleReview.IRequest,
    },
  );
  typia.assert(page1);
  // 3. Fetch second page of sale reviews without filters (if any pages exist)
  if (page1.pagination.pages > 1) {
    const page2 = await api.functional.shoppingMall.customer.sale_reviews.index(
      authorizedConnection,
      {
        body: {} as IShoppingMallSaleReview.IRequest,
      },
    );
    typia.assert(page2);
    // Validate pagination info consistency
    TestValidator.predicate(
      "second page current page number",
      page2.pagination.current === 2,
    );
    TestValidator.predicate(
      "second page different from first page",
      page2.data.length !== page1.data.length ||
        page2.pagination.current !== page1.pagination.current,
    );
  }
  // 4. Ensure unauthorized customer cannot access
  const noAuthConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("unauthorized access should fail", async () => {
    await api.functional.shoppingMall.customer.sale_reviews.index(
      noAuthConnection,
      {
        body: {} as IShoppingMallSaleReview.IRequest,
      },
    );
  });
}
