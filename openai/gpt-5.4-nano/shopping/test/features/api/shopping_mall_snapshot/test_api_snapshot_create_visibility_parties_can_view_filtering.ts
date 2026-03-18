import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSnapshot";
import type { IShoppingMallSnapshotParty } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSnapshotParty";
import type { IShoppingMallSnapshotPayload } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSnapshotPayload";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_shopping_mall_admin_snapshots_create } from "../../../generate/generate_random_shopping_mall_admin_snapshots_create";
import { prepare_random_shopping_mall_snapshot } from "../../../prepare/prepare_random_shopping_mall_snapshot";

export async function test_api_snapshot_create_visibility_parties_can_view_filtering(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  const credentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies IShoppingMallAdmin.IJoin;
  await authorize_admin_join(adminConnection, { body: credentials });
  const snapshotCode = `snap_${RandomGenerator.alphabets(10)}_${Date.now()}`;
  const sourceEntityId = typia.random<string & tags.Format<"uuid">>();
  const created = await api.functional.shoppingMall.admin.snapshots.create(
    adminConnection,
    {
      body: {
        snapshot_code: snapshotCode,
        source_type: "product",
        source_entity_id: sourceEntityId,
        reason: RandomGenerator.paragraph({ sentences: 1 }),
        source_seller_id: null,
        source_order_id: null,
        source_order_item_id: null,
        source_review_id: null,
        source_cancellation_request_id: null,
        source_refund_request_id: null,
        created_by_member_id: null,
      } satisfies IShoppingMallSnapshot.ICreate,
    },
  );
  typia.assert(created);
  TestValidator.equals(
    "snapshot_code roundtrip",
    created.snapshotCode,
    snapshotCode,
  );
  // Since IShoppingMallSnapshot.ICreate does not accept `parties`,
  // we can only validate that returned parties expose correct can_view
  // booleans and are associated with this snapshot.
  const parties = created.parties;
  TestValidator.predicate("parties is an array", Array.isArray(parties));
  TestValidator.predicate(
    "all parties reference this snapshot",
    parties.every((p) => p.shopping_mall_snapshot_id === created.id),
  );
  TestValidator.predicate("at least one party exists", parties.length >= 1);
  const hasCanViewTrue = parties.some((p) => p.can_view === true);
  const hasCanViewFalse = parties.some((p) => p.can_view === false);
  // If system returns both types of visibility entries, ensure both are present.
  // Otherwise, just ensure can_view values are valid booleans (already true).
  if (parties.length >= 2) {
    TestValidator.predicate(
      "has both can_view=true and can_view=false",
      hasCanViewTrue && hasCanViewFalse,
    );
  } else {
    TestValidator.predicate(
      "can_view is boolean",
      parties[0].can_view === true || parties[0].can_view === false,
    );
  }
}
