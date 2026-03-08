import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
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

export async function test_api_seller_inventory_record_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration and authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(seller);
  // 2. Create a new connection with seller's authorization token
  const sellerAuthorizedConnection: api.IConnection = { host: connection.host };
  sellerAuthorizedConnection.headers = {
    Authorization: seller.token.access,
  };
  // 3. Generate valid UUIDs for variant and inventory record
  const variantId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const inventoryRecordId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 4. Retrieve inventory record for the variant
  // This tests the successful retrieval endpoint
  const inventoryRecord =
    await api.functional.ecommerceMall.seller.variants.inventory_records.at(
      sellerAuthorizedConnection,
      {
        variantId,
        inventoryRecordId,
      },
    );
  typia.assert(inventoryRecord);
  // 5. Validate inventory record contains all required fields
  TestValidator.equals(
    "inventory record id exists and is uuid",
    inventoryRecord.id,
    inventoryRecord.id,
  );
  TestValidator.equals(
    "variant_id matches requested variant",
    inventoryRecord.variant_id,
    variantId,
  );
  TestValidator.equals(
    "quantity_change is positive integer for restocking",
    inventoryRecord.quantity_change > 0,
    true,
  );
  TestValidator.equals(
    "reason is restocking",
    inventoryRecord.reason,
    "restocking",
  );
  TestValidator.equals(
    "timestamp is valid ISO 8601 format",
    inventoryRecord.timestamp,
    inventoryRecord.timestamp,
  );
  TestValidator.equals(
    "variant relationship exists",
    inventoryRecord.variant.id,
    inventoryRecord.variant.id,
  );
}
