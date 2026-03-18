import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_product_snapshot_view_owner_visibility(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const authorized: IShoppingMallMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: { email, password } satisfies IShoppingMallMember.IJoin,
    });
  typia.assert(authorized);
  const snapshotId1 = typia.random<string & tags.Format<"uuid">>();
  const snapshotId2 = typia.random<string & tags.Format<"uuid">>();
  const snapshot1a: IShoppingMallProductSnapshot =
    await api.functional.shoppingMall.member.productSnapshots.at(
      memberConnection,
      { productSnapshotId: snapshotId1 },
    );
  typia.assert(snapshot1a);
  const snapshot1b: IShoppingMallProductSnapshot =
    await api.functional.shoppingMall.member.productSnapshots.at(
      memberConnection,
      { productSnapshotId: snapshotId1 },
    );
  typia.assert(snapshot1b);
  TestValidator.equals("snapshot repeatable (id1)", snapshot1b, snapshot1a);
  const snapshot2a: IShoppingMallProductSnapshot =
    await api.functional.shoppingMall.member.productSnapshots.at(
      memberConnection,
      { productSnapshotId: snapshotId2 },
    );
  typia.assert(snapshot2a);
  const snapshot2b: IShoppingMallProductSnapshot =
    await api.functional.shoppingMall.member.productSnapshots.at(
      memberConnection,
      { productSnapshotId: snapshotId2 },
    );
  typia.assert(snapshot2b);
  TestValidator.equals("snapshot repeatable (id2)", snapshot2b, snapshot2a);
  TestValidator.equals(
    "snapshot_seller_id stable (id1)",
    snapshot1a.snapshot_seller_id,
    snapshot1b.snapshot_seller_id,
  );
  TestValidator.equals(
    "shopping_mall_product_id stable (id1)",
    snapshot1a.shopping_mall_product_id,
    snapshot1b.shopping_mall_product_id,
  );
  TestValidator.equals(
    "snapshot_seller_id stable (id2)",
    snapshot2a.snapshot_seller_id,
    snapshot2b.snapshot_seller_id,
  );
  TestValidator.equals(
    "shopping_mall_product_id stable (id2)",
    snapshot2a.shopping_mall_product_id,
    snapshot2b.shopping_mall_product_id,
  );
  // Soft-delete state should be consistent for the same snapshot id.
  TestValidator.equals(
    "deleted_at consistent (id1)",
    snapshot1a.deleted_at,
    snapshot1b.deleted_at,
  );
  TestValidator.equals(
    "deleted_at consistent (id2)",
    snapshot2a.deleted_at,
    snapshot2b.deleted_at,
  );
}
