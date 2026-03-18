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

export async function test_api_snapshot_create_duplicate_snapshot_code_conflict(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  const credentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies IShoppingMallAdmin.IJoin;
  const authorized = await authorize_admin_join(adminConnection, {
    body: credentials,
  });
  typia.assert(authorized);
  const snapshotCode = typia.random<string>();
  const sourceEntityIdA = typia.random<string & tags.Format<"uuid">>();
  const sourceEntityIdB = typia.random<string & tags.Format<"uuid">>();
  const firstBody = {
    snapshot_code: snapshotCode,
    source_type: "product",
    source_entity_id: sourceEntityIdA,
    source_seller_id: null,
    source_order_id: null,
    source_order_item_id: null,
    source_review_id: null,
    source_cancellation_request_id: null,
    source_refund_request_id: null,
    created_by_member_id: null,
    reason: RandomGenerator.paragraph({ sentences: 1 }),
  } satisfies IShoppingMallSnapshot.ICreate;
  const firstCreated = await api.functional.shoppingMall.admin.snapshots.create(
    adminConnection,
    {
      body: firstBody,
    },
  );
  typia.assert(firstCreated);
  const secondBody = {
    ...firstBody,
    source_entity_id: sourceEntityIdB,
    reason: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IShoppingMallSnapshot.ICreate;
  await TestValidator.httpError(
    "duplicate snapshot_code should conflict",
    409,
    async () => {
      await api.functional.shoppingMall.admin.snapshots.create(
        adminConnection,
        {
          body: secondBody,
        },
      );
    },
  );
  // Since no admin snapshot read endpoint is available in the provided SDK,
  // we validate that the first snapshot response is self-consistent and that
  // its snapshot_code remains the requested one.
  TestValidator.equals(
    "snapshot_code preserved",
    firstCreated.snapshotCode,
    snapshotCode,
  );
  TestValidator.equals(
    "source_entity_id preserved",
    firstCreated.sourceEntityId,
    sourceEntityIdA,
  );
  TestValidator.equals(
    "reason preserved",
    firstCreated.reason,
    firstBody.reason,
  );
  // Payload & parties must be consistent within the snapshot returned from creation.
  if (firstCreated.payload !== null) {
    TestValidator.equals(
      "payload parent snapshot id matches",
      firstCreated.payload.shopping_mall_snapshot_id,
      firstCreated.id,
    );
  }
  // Parties are returned as summaries; ensure it is at least an array.
  TestValidator.predicate(
    "parties array exists",
    Array.isArray(firstCreated.parties),
  );
}
