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
import { generate_random_shopping_mall_admin_snapshots_parties_create_snapshot_party } from "../../../generate/generate_random_shopping_mall_admin_snapshots_parties_create_snapshot_party";
import { prepare_random_shopping_mall_snapshot } from "../../../prepare/prepare_random_shopping_mall_snapshot";
import { prepare_random_shopping_mall_snapshot_party } from "../../../prepare/prepare_random_shopping_mall_snapshot_party";

export async function test_api_snapshot_parties_create_denied_visibility(
  connection: api.IConnection,
): Promise<void> {
  // 1) Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password!1234",
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2) Create snapshot
  const snapshot = await generate_random_shopping_mall_admin_snapshots_create(
    adminConnection,
    {
      body: {
        snapshot_code: `snap_${RandomGenerator.alphabets(10)}`,
        source_type: `source_${RandomGenerator.alphabets(6)}`,
        reason: RandomGenerator.paragraph({ sentences: 2 }),
        source_entity_id: typia.random<string & tags.Format<"uuid">>(),
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
  typia.assert(snapshot);
  // 3) Create snapshot party entry with canView=false
  const partyType = RandomGenerator.pick(["owner", "admin"] as const);
  const partyId = typia.random<string & tags.Format<"uuid">>();
  const inputBody = {
    partyType: partyType,
    partyId: partyId,
    canView: false,
  } satisfies IShoppingMallSnapshotParty.ICreate;
  const created =
    await generate_random_shopping_mall_admin_snapshots_parties_create_snapshot_party(
      adminConnection,
      {
        params: { snapshotId: snapshot.id },
        body: inputBody,
      },
    );
  typia.assert(created);
  // 4) Validate response fields
  TestValidator.equals(
    "shopping_mall_snapshot_id matches",
    created.shopping_mall_snapshot_id,
    snapshot.id,
  );
  TestValidator.equals("party_type matches", created.party_type, partyType);
  TestValidator.equals("party_id matches", created.party_id, partyId);
  TestValidator.equals("can_view is false", created.can_view, false);
  TestValidator.equals("deleted_at is null", created.deleted_at, null);
}
