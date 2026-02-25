import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceVariantInventory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceVariantInventory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_inventory_analytics_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller join
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller: IEcommerceSeller.IAuthorized = await authorize_seller_join(
    sellerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IEcommerceSeller.IJoin,
    },
  );
  typia.assert(seller);
  // 2. Retrieve inventory analytics
  const analytics: IEcommerceVariantInventory =
    await api.functional.ecommerce.seller.analytics.inventories.inventoryAnalytics(
      sellerConnection,
    );
  typia.assert(analytics);
  // 3. Validate the response
  TestValidator.predicate(
    "should be non-empty inventory analytics",
    analytics.currentStock > 0,
  );
  TestValidator.predicate(
    "should have adjustment summary",
    analytics.adjustmentSummary !== undefined &&
      Object.keys(analytics.adjustmentSummary).length > 0,
  );
}
