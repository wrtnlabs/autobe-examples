import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItemSnapshot";
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

export async function test_api_seller_order_snapshot_refund_event(
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
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. Create a random snapshot ID (simulating an existing refund snapshot)
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  // 3. Retrieve the refund snapshot
  const snapshot = await api.functional.ecommerceMall.seller.order_snapshots.at(
    sellerConnection,
    {
      id: snapshotId,
    },
  );
  typia.assert(snapshot);
  // 4. Validate snapshot type is refund
  TestValidator.equals(
    "snapshot type is refund",
    snapshot.snapshot_type,
    "refund",
  );
  // 5. Validate business logic: total_price should equal quantity * unit_price
  const expectedTotal = snapshot.quantity * snapshot.unit_price;
  TestValidator.equals(
    "total price equals quantity times unit price",
    snapshot.total_price,
    expectedTotal,
  );
  // 6. Validate snapshot preserves historical data
  TestValidator.equals(
    "snapshot has non-empty product name",
    snapshot.product_name.length > 0,
    true,
  );
  TestValidator.equals(
    "snapshot has non-empty seller name",
    snapshot.seller_name.length > 0,
    true,
  );
  // 7. Validate product_variant_options is valid JSON string
  try {
    JSON.parse(snapshot.product_variant_options);
    TestValidator.predicate(
      "product_variant_options is valid JSON string",
      true,
    );
  } catch {
    TestValidator.error(
      "product_variant_options should be valid JSON string",
      () => {
        throw new Error("Invalid JSON in product_variant_options");
      },
    );
  }
}
