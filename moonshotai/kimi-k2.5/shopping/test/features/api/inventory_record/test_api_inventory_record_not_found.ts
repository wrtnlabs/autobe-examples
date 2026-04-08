import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test inventory record retrieval with non-existent ID.
 * Verifies proper 404 error response when attempting to access non-existent inventory records,
 * preventing unauthorized access to other sellers' inventory data.
 */
export async function test_api_inventory_record_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller connection and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const joinedSeller = await authorize_seller_join(sellerConnection, {
    body: {},
  });
  typia.assert(joinedSeller);
  // 2. Generate a random non-existent inventory record ID
  const nonExistentRecordId = typia.random<string & tags.Format<"uuid">>();
  // 3. Attempt to fetch non-existent record and expect 404 error
  await TestValidator.httpError(
    "returns 404 for non-existent inventory record",
    404,
    async () => {
      await api.functional.ecommerceMall.seller.inventory_records.at(
        sellerConnection,
        {
          inventoryRecordId: nonExistentRecordId,
        },
      );
    },
  );
}
