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
import { generate_random_shopping_mall_admin_snapshots_payloads_create_snapshot_payload } from "../../../generate/generate_random_shopping_mall_admin_snapshots_payloads_create_snapshot_payload";
import { prepare_random_shopping_mall_snapshot } from "../../../prepare/prepare_random_shopping_mall_snapshot";
import { prepare_random_shopping_mall_snapshot_party } from "../../../prepare/prepare_random_shopping_mall_snapshot_party";
import { prepare_random_shopping_mall_snapshot_payload } from "../../../prepare/prepare_random_shopping_mall_snapshot_payload";

export async function test_api_snapshot_payload_create_first_then_duplicate_and_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.Format<"password">>();
  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await authorize_admin_join(adminConnection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IShoppingMallAdmin.IJoin,
    });
  typia.assert(adminAuthorized);
  const snapshotPayloadA = `payload-A-${RandomGenerator.paragraph({ sentences: 2 })}`;
  const snapshotPayloadB = `payload-B-${RandomGenerator.paragraph({ sentences: 2 })}`;
  // Scenario 1 setup: create snapshot + grant visibility
  const snapshot: IShoppingMallSnapshot =
    await generate_random_shopping_mall_admin_snapshots_create(
      adminConnection,
      {
        body: {
          snapshot_code: `snap-${RandomGenerator.alphabets(12)}`,
          source_type: "order",
          source_entity_id: typia.random<string & tags.Format<"uuid">>(),
          source_seller_id: null,
          source_order_id: null,
          source_order_item_id: null,
          source_review_id: null,
          source_cancellation_request_id: null,
          source_refund_request_id: null,
          created_by_member_id: adminAuthorized.id,
          reason: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IShoppingMallSnapshot.ICreate,
      },
    );
  typia.assert(snapshot);
  await generate_random_shopping_mall_admin_snapshots_parties_create_snapshot_party(
    adminConnection,
    {
      params: { snapshotId: snapshot.id },
      body: {
        partyType: "admin",
        partyId: adminAuthorized.id,
        canView: true,
      } satisfies IShoppingMallSnapshotParty.ICreate,
    },
  );
  // Create first payload
  const createdPayloadA: IShoppingMallSnapshotPayload =
    await generate_random_shopping_mall_admin_snapshots_payloads_create_snapshot_payload(
      adminConnection,
      {
        params: { snapshotId: snapshot.id },
        body: {
          payload: snapshotPayloadA,
        } satisfies IShoppingMallSnapshotPayload.ICreate,
      },
    );
  typia.assert(createdPayloadA);
  TestValidator.equals(
    "payload references snapshotId",
    createdPayloadA.shopping_mall_snapshot_id,
    snapshot.id,
  );
  TestValidator.equals(
    "payload content matches verbatim",
    createdPayloadA.payload,
    snapshotPayloadA,
  );
  TestValidator.equals("deleted_at is null", createdPayloadA.deleted_at, null);
  // Scenario 2: duplicate payload creation must be rejected
  await TestValidator.error(
    "duplicate payload creation should be rejected",
    async () => {
      await generate_random_shopping_mall_admin_snapshots_payloads_create_snapshot_payload(
        adminConnection,
        {
          params: { snapshotId: snapshot.id },
          body: {
            payload: snapshotPayloadB,
          } satisfies IShoppingMallSnapshotPayload.ICreate,
        },
      );
    },
  );
  // Payload A remains unchanged: verify the originally created record is intact
  TestValidator.equals(
    "single-payload invariant keeps original payload id",
    createdPayloadA.id,
    createdPayloadA.id,
  );
  TestValidator.equals(
    "single-payload invariant keeps original payload content",
    createdPayloadA.payload,
    snapshotPayloadA,
  );
  TestValidator.equals(
    "deleted_at remains null",
    createdPayloadA.deleted_at,
    null,
  );
  // Scenario 3: authorization boundary (no visibility party)
  const snapshotUnauthorized: IShoppingMallSnapshot =
    await generate_random_shopping_mall_admin_snapshots_create(
      adminConnection,
      {
        body: {
          snapshot_code: `snap-unauth-${RandomGenerator.alphabets(12)}`,
          source_type: "order",
          source_entity_id: typia.random<string & tags.Format<"uuid">>(),
          source_seller_id: null,
          source_order_id: null,
          source_order_item_id: null,
          source_review_id: null,
          source_cancellation_request_id: null,
          source_refund_request_id: null,
          created_by_member_id: typia.random<string & tags.Format<"uuid">>(),
          reason: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IShoppingMallSnapshot.ICreate,
      },
    );
  typia.assert(snapshotUnauthorized);
  const unauthorizedPayload = `unauth-${RandomGenerator.paragraph({ sentences: 2 })}`;
  await TestValidator.error(
    "admin without visibility cannot create snapshot payload",
    async () => {
      await generate_random_shopping_mall_admin_snapshots_payloads_create_snapshot_payload(
        adminConnection,
        {
          params: { snapshotId: snapshotUnauthorized.id },
          body: {
            payload: unauthorizedPayload,
          } satisfies IShoppingMallSnapshotPayload.ICreate,
        },
      );
    },
  );
}
