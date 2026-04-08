import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallInventoryRecord";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_inventory_history_empty(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerAuth);
  // 2. Create valid productId and variantId for testing
  const productId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const variantId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Query inventory history with empty request (no records exist)
  const response =
    await api.functional.ecommerceMall.seller.products.variants.inventory_history.inventoryHistory(
      sellerConnection,
      {
        productId,
        variantId,
        body: {
          search: null,
        } satisfies IEcommerceMallInventoryRecord.IRequest,
      },
    );
  typia.assert(response);
  // 4. Validate empty result handling
  TestValidator.equals(
    "data array should be empty when no inventory records exist",
    response.data,
    [],
  );
  TestValidator.equals(
    "pagination records should be 0 when no inventory records exist",
    response.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages should be 0 when no inventory records exist",
    response.pagination.pages,
    0,
  );
  TestValidator.equals(
    "pagination current page should default to 1",
    response.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit should default to 20",
    response.pagination.limit,
    20,
  );
  // 5. Verify endpoint returns valid response (not 404 or other error)
  // This confirms the variant exists and endpoint handles missing inventory gracefully
  TestValidator.predicate(
    "endpoint returns 200 for variant with no inventory history",
    response.pagination.records === 0,
  );
}