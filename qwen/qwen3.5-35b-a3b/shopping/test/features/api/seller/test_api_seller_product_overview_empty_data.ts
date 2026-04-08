import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategoriesStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategoriesStatistic";
import type { IEcommerceMallProductOverview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductOverview";
import type { IEcommerceMallProductOverviewRecentProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductOverviewRecentProduct";
import type { IEcommerceMallProductOverviewSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductOverviewSeller";
import type { IEcommerceMallProductOverviewStatusBreakdown } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductOverviewStatusBreakdown";
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

export async function test_api_seller_product_overview_empty_data(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(seller);
  const overview =
    await api.functional.ecommerceMall.seller.products.overview(
      sellerConnection,
    );
  typia.assert(overview);
  TestValidator.equals("total products is zero", overview.totalProducts, 0);
  TestValidator.equals("deleted products is zero", overview.deletedProducts, 0);
  TestValidator.equals(
    "categories with products is zero",
    overview.totalCategoriesWithProducts,
    0,
  );
  TestValidator.equals("total reviews is zero", overview.totalReviews, 0);
  TestValidator.equals("average rating is null", overview.averageRating, null);
  TestValidator.equals(
    "products by category is empty",
    overview.productsByCategory,
    [],
  );
  TestValidator.equals(
    "products by seller is empty",
    overview.productsBySeller,
    [],
  );
  TestValidator.predicate(
    "recent products is array",
    Array.isArray(overview.recentProducts),
  );
  TestValidator.equals(
    "status breakdown active is zero",
    overview.statusBreakdown.active,
    0,
  );
  TestValidator.equals(
    "status breakdown deleted is zero",
    overview.statusBreakdown.deleted,
    0,
  );
}
