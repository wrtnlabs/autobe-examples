import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
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

/**
 * Test seller inventory history retrieval success path.
 * 1. Register seller and authenticate
 * 2. Query inventory history for a variant
 * 3. Verify pagination and response structure
 */
export async function test_api_seller_inventory_history_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerAuth);
  // 2. Query inventory history
  const variantId = typia.random<string & tags.Format<"uuid">>();
  const inventoryHistory =
    await api.functional.ecommerceMall.seller.variants.inventory_records.index(
      sellerConnection,
      {
        variantId,
        body: {
          pageSize: typia.random<
            number &
              tags.Type<"int32"> &
              tags.Default<20> &
              tags.Minimum<1> &
              tags.Maximum<100>
          >(),
          sortOrder: "desc",
        },
      },
    );
  typia.assert(inventoryHistory);
  // 3. Validate pagination structure exists
  typia.assert(inventoryHistory.pagination);
  // 4. Validate records array exists
  typia.assert(inventoryHistory.data);
  // 5. If records exist, validate their structure
  if (inventoryHistory.data.length > 0) {
    const firstRecord = inventoryHistory.data[0];
    typia.assert(firstRecord);
    // Validate record has required fields
    TestValidator.predicate(
      "record has valid variant_id",
      firstRecord.variant_id !== undefined,
    );
    TestValidator.predicate(
      "record has quantity_change",
      firstRecord.quantity_change !== undefined,
    );
    TestValidator.predicate(
      "record has reason",
      firstRecord.reason !== undefined,
    );
    TestValidator.predicate(
      "record has timestamp",
      firstRecord.timestamp !== undefined,
    );
  }
  // 6. Validate pagination metadata
  TestValidator.predicate(
    "pagination has valid current page",
    inventoryHistory.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination has valid limit",
    inventoryHistory.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination has valid records count",
    inventoryHistory.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has valid pages count",
    inventoryHistory.pagination.pages >= 0,
  );
}
