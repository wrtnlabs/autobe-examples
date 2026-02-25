import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformEvent";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommercePlatformEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformEvent";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_analytics_sales_no_data_period(
  connection: api.IConnection,
): Promise<void> {
  // Create seller connection and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string>(),
      shop_name: typia.random<string>(),
      shop_description: typia.random<string>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(seller);
  // Query sales analytics for a period with no data
  // Using random dates far in the past where no sales should exist
  const startDate = typia.random<string & tags.Format<"date-time">>();
  const endDate = typia.random<string & tags.Format<"date-time">>();
  const analytics = await api.functional.ecommerce.seller.analytics.sales.index(
    sellerConnection,
    {
      body: {
        date_from: startDate,
        date_to: endDate,
        page: 1,
        limit: 10,
      } satisfies IEcommercePlatformEvent.IRequest,
    },
  );
  typia.assert(analytics);
  // Validate pagination metadata shows zero records for no-data scenario
  TestValidator.equals(
    "pagination records should be zero",
    analytics.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages should be zero",
    analytics.pagination.pages,
    0,
  );
  TestValidator.equals(
    "pagination current page should be 1",
    analytics.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit should match request",
    analytics.pagination.limit,
    10,
  );
  // Validate data array is empty (authorization boundary implicitly tested by empty result)
  TestValidator.equals("data array should be empty", analytics.data.length, 0);
}
