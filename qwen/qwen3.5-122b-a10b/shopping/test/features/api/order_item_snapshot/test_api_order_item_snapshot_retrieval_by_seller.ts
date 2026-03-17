import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItemSnapshot";
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

export async function test_api_order_item_snapshot_retrieval_by_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. Generate snapshot ID and retrieve snapshot
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  const snapshot = await api.functional.ecommerceMall.seller.snapshots.at(
    sellerConnection,
    {
      snapshotId,
    },
  );
  typia.assert(snapshot);
  // 3. Validate snapshot structure
  TestValidator.equals("snapshot ID matches", snapshot.id, snapshotId);
  TestValidator.predicate(
    "has order item ID",
    snapshot.orderItemId !== undefined,
  );
  TestValidator.predicate(
    "has snapshot type",
    snapshot.snapshotType !== undefined,
  );
  TestValidator.predicate(
    "has creation timestamp",
    snapshot.createdAt !== undefined,
  );
  TestValidator.predicate(
    "has current values",
    snapshot.currentValues !== undefined,
  );
  TestValidator.predicate(
    "has order item summary",
    snapshot.orderItem !== undefined,
  );
  // 4. Validate current values structure
  const currentValues = snapshot.currentValues;
  TestValidator.predicate(
    "has product name",
    currentValues.productName !== undefined,
  );
  TestValidator.predicate(
    "has product description",
    currentValues.productDescription !== undefined,
  );
  TestValidator.predicate(
    "has variant SKU",
    currentValues.variantSku !== undefined,
  );
  TestValidator.predicate(
    "has variant options",
    currentValues.variantOptions !== undefined,
  );
  TestValidator.predicate(
    "has seller shop name",
    currentValues.sellerShopName !== undefined,
  );
  TestValidator.predicate("has quantity", currentValues.quantity !== undefined);
  TestValidator.predicate(
    "has unit price",
    currentValues.unitPrice !== undefined,
  );
  TestValidator.predicate("has status", currentValues.status !== undefined);
  // 5. Validate order item summary
  const orderItem = snapshot.orderItem;
  TestValidator.predicate("order item has ID", orderItem.id !== undefined);
  TestValidator.predicate(
    "order item has quantity",
    orderItem.quantity !== undefined,
  );
  TestValidator.predicate(
    "order item has unit price",
    orderItem.unitPrice !== undefined,
  );
  TestValidator.predicate(
    "order item has status",
    orderItem.status !== undefined,
  );
  TestValidator.predicate(
    "order item has parent order",
    orderItem.order !== undefined,
  );
  TestValidator.predicate(
    "order item has product variant",
    orderItem.productVariant !== undefined,
  );
}
