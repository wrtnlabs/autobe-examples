import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductSnapshot";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_product_snapshots_history(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IShoppingMallSeller.IJoin;
  await authorize_seller_join(sellerConnection, { body: sellerData });
  // Query product snapshots
  const snapshots = await api.functional.shoppingMall.seller.snapshots.index(
    sellerConnection,
    {
      body: {
        entity_type: "product",
        changed_by: "seller",
        page: 1,
        limit: 10,
      } satisfies IShoppingMallProductSnapshot.IRequest,
    },
  );
  typia.assert(snapshots);
  // Validate response structure
  TestValidator.equals(
    "snapshots have correct pagination structure",
    snapshots.pagination.current,
    1,
  );
  TestValidator.equals(
    "snapshots have correct limit",
    snapshots.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "at least one snapshot exists",
    () => snapshots.data.length >= 1,
  );
  // Validate each snapshot has the correct structure
  for (const snapshot of snapshots.data) {
    TestValidator.equals("snapshot type is product", snapshot.type, "product");
    TestValidator.predicate("snapshot changed_at is ISO 8601", () => {
      const date = new Date(snapshot.changed_at);
      return !isNaN(date.getTime());
    });
    TestValidator.equals(
      "snapshot changed_by is seller",
      snapshot.changed_by,
      "seller",
    );
    TestValidator.predicate(
      "snapshot version is positive integer",
      () => snapshot.version > 0,
    );
    TestValidator.equals(
      "snapshot has snapshot_data object",
      typeof snapshot.snapshot_data,
      "object",
    );
    TestValidator.equals(
      "snapshot_data.id is UUID",
      typeof snapshot.snapshot_data.id,
      "string",
    );
    TestValidator.predicate("snapshot_data.id is valid UUID format", () => {
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      return uuidRegex.test(snapshot.snapshot_data.id);
    });
    TestValidator.equals(
      "snapshot_data.name is string",
      typeof snapshot.snapshot_data.name,
      "string",
    );
    TestValidator.predicate(
      "snapshot_data.base_price is positive number",
      () => snapshot.snapshot_data.base_price > 0,
    );
    TestValidator.equals(
      "snapshot_data.category_id is UUID",
      typeof snapshot.snapshot_data.category_id,
      "string",
    );
    TestValidator.predicate(
      "snapshot_data.category_id is valid UUID format",
      () => {
        const uuidRegex =
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        return uuidRegex.test(snapshot.snapshot_data.category_id);
      },
    );
  }
}
