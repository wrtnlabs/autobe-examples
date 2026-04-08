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

export async function test_api_seller_order_snapshot_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register seller
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const sellerJoined: IEcommerceMallSeller.IAuthorized =
    await authorize_seller_join(sellerJoinConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(2),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    });
  typia.assert(sellerJoined);
  // Step 2: Create seller connection with token
  const sellerConnection: api.IConnection = { host: connection.host };
  sellerConnection.headers = { Authorization: sellerJoined.token.access };
  // Step 3: Generate a random snapshot ID to test retrieval
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  // Step 4: Retrieve order snapshot
  const snapshot: IEcommerceMallOrderItemSnapshot =
    await api.functional.ecommerceMall.seller.order_snapshots.at(
      sellerConnection,
      { id: snapshotId },
    );
  typia.assert(snapshot);
  // Step 5: Validate snapshot structure
  TestValidator.notEquals("snapshot ID exists", snapshot.id, null as any);
  TestValidator.notEquals("order ID exists", snapshot.order_id, null as any);
  TestValidator.notEquals(
    "product ID exists",
    snapshot.product_id,
    null as any,
  );
  TestValidator.predicate(
    "product name is populated",
    snapshot.product_name.length > 0,
  );
  TestValidator.notEquals(
    "product variant ID exists",
    snapshot.product_variant_id,
    null as any,
  );
  TestValidator.predicate(
    "variant options JSON string exists",
    snapshot.product_variant_options.length > 0,
  );
  TestValidator.notEquals("seller ID exists", snapshot.seller_id, null as any);
  TestValidator.predicate(
    "seller name is populated",
    snapshot.seller_name.length > 0,
  );
  TestValidator.predicate(
    "quantity is positive integer",
    snapshot.quantity > 0,
  );
  TestValidator.predicate("unit price is positive", snapshot.unit_price > 0);
  TestValidator.predicate("total price is positive", snapshot.total_price > 0);
  TestValidator.equals(
    "snapshot type is checkout",
    snapshot.snapshot_type,
    "checkout",
  );
  TestValidator.notEquals(
    "created_at exists",
    snapshot.created_at,
    null as any,
  );
}
