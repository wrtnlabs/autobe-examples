import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategoriesStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategoriesStatistic";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_category_stats_empty_category(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const result = await authorize_seller_join(sellerConnection, {
    body: undefined,
  });
  typia.assert(result);
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  const stats = await api.functional.ecommerceMall.seller.categories.stats(
    sellerConnection,
    {
      categoryId,
    },
  );
  typia.assert(stats);
  TestValidator.equals(
    "total products count is zero",
    stats.totalProductsCount,
    0,
  );
  TestValidator.equals(
    "active products count is zero",
    stats.activeProductCount,
    0,
  );
  TestValidator.equals("total orders count is zero", stats.totalOrderCount, 0);
  TestValidator.equals(
    "unique customer count is zero",
    stats.uniqueCustomerCount,
    0,
  );
  TestValidator.equals("average rating is null", stats.averageRating, null);
  TestValidator.equals("last updated is null", stats.lastUpdated, null);
}
