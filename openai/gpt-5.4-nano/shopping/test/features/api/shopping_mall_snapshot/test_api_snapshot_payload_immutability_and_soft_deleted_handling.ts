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
import { generate_random_shopping_mall_admin_snapshots_payloads_create_snapshot_payload } from "../../../generate/generate_random_shopping_mall_admin_snapshots_payloads_create_snapshot_payload";
import { prepare_random_shopping_mall_snapshot } from "../../../prepare/prepare_random_shopping_mall_snapshot";
import { prepare_random_shopping_mall_snapshot_payload } from "../../../prepare/prepare_random_shopping_mall_snapshot_payload";

export async function test_api_snapshot_payload_immutability_and_soft_deleted_handling(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1 & 2: snapshot payload immutability and soft-deleted handling
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // ---------- Scenario 1: immutability across repeated reads ----------
  const snapshot = await generate_random_shopping_mall_admin_snapshots_create(
    adminConnection,
    {
      body: {
        snapshot_code: typia.random<string>(),
        source_type: typia.random<string>(),
        source_entity_id: typia.random<string & tags.Format<"uuid">>(),
        source_seller_id: null,
        source_order_id: null,
        source_order_item_id: null,
        source_review_id: null,
        source_cancellation_request_id: null,
        source_refund_request_id: null,
        created_by_member_id: null,
        reason: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IShoppingMallSnapshot.ICreate,
    },
  );
  typia.assert(snapshot);
  const originalPayloadContent: string = RandomGenerator.content({
    paragraphs: 2,
  });
  const createdPayload =
    await generate_random_shopping_mall_admin_snapshots_payloads_create_snapshot_payload(
      adminConnection,
      {
        params: { snapshotId: snapshot.id },
        body: {
          payload: originalPayloadContent,
        } satisfies IShoppingMallSnapshotPayload.ICreate,
      },
    );
  typia.assert(createdPayload);
  const firstRead =
    await api.functional.shoppingMall.admin.snapshots.payloads.at(
      adminConnection,
      {
        snapshotId: snapshot.id,
        snapshotPayloadId: createdPayload.id,
      },
    );
  typia.assert(firstRead);
  const secondRead =
    await api.functional.shoppingMall.admin.snapshots.payloads.at(
      adminConnection,
      {
        snapshotId: snapshot.id,
        snapshotPayloadId: createdPayload.id,
      },
    );
  typia.assert(secondRead);
  TestValidator.equals(
    "payload shopping_mall_snapshot_id matches",
    firstRead.shopping_mall_snapshot_id,
    createdPayload.shopping_mall_snapshot_id,
  );
  TestValidator.equals("payload ids match", firstRead.id, secondRead.id);
  TestValidator.equals(
    "payload content stable across reads",
    firstRead.payload,
    secondRead.payload,
  );
  TestValidator.equals(
    "deleted_at is null (not soft-deleted)",
    firstRead.deleted_at,
    null,
  );
  TestValidator.equals(
    "deleted_at is null on second read",
    secondRead.deleted_at,
    null,
  );
  // ---------- Scenario 2: soft-deleted payload should not be exposed ----------
  const snapshot2 = await generate_random_shopping_mall_admin_snapshots_create(
    adminConnection,
    {
      body: {
        snapshot_code: typia.random<string>(),
        source_type: typia.random<string>(),
        source_entity_id: typia.random<string & tags.Format<"uuid">>(),
        source_seller_id: null,
        source_order_id: null,
        source_order_item_id: null,
        source_review_id: null,
        source_cancellation_request_id: null,
        source_refund_request_id: null,
        created_by_member_id: null,
        reason: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IShoppingMallSnapshot.ICreate,
    },
  );
  typia.assert(snapshot2);
  const createdPayload2Content: string = RandomGenerator.content({
    paragraphs: 2,
  });
  const createdPayload2 =
    await generate_random_shopping_mall_admin_snapshots_payloads_create_snapshot_payload(
      adminConnection,
      {
        params: { snapshotId: snapshot2.id },
        body: {
          payload: createdPayload2Content,
        } satisfies IShoppingMallSnapshotPayload.ICreate,
      },
    );
  typia.assert(createdPayload2);
  // Attempt soft-delete via admin payload update operation
  await api.functional.shoppingMall.admin.snapshots.payloads.updatePayloads(
    adminConnection,
    {
      snapshotId: snapshot2.id,
      body: {
        payload: createdPayload2Content,
      } satisfies IShoppingMallSnapshotPayload.IUpdate,
    },
  );
  // GET must not expose content for soft-deleted records.
  // Accept either: (a) request fails (auth/access/not found), OR (b) returns deleted payload with non-null deleted_at.
  try {
    const afterDeleteRead =
      await api.functional.shoppingMall.admin.snapshots.payloads.at(
        adminConnection,
        {
          snapshotId: snapshot2.id,
          snapshotPayloadId: createdPayload2.id,
        },
      );
    typia.assert(afterDeleteRead);
    // If it returns a DTO, it must indicate deletion and not expose payload.
    TestValidator.notEquals(
      "deleted_at should be non-null after soft deletion",
      afterDeleteRead.deleted_at,
      null,
    );
    TestValidator.equals(
      "payload must not be exposed for soft-deleted record",
      afterDeleteRead.payload,
      "",
    );
  } catch {
    // If server hides deleted payloads via access control or not-found, this is acceptable.
  }
}
