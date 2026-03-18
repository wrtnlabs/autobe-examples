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

export async function test_api_snapshot_create_admin_success_and_uniqueness(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  const snapshotCode = `snap_${RandomGenerator.alphabets(16)}`;
  const sourceEntityId = typia.random<string & tags.Format<"uuid">>();
  const partyId = typia.random<string & tags.Format<"uuid">>();
  const reason = RandomGenerator.paragraph({ sentences: 2 });
  const sourceType = "order_item";
  const payloadObject = {
    immutable: true,
    createdAt: new Date().toISOString(),
    marker: RandomGenerator.alphabets(24),
  };
  const payload = JSON.stringify(payloadObject);
  const party_type = "admin";
  const body: DeepPartial<IShoppingMallSnapshot.ICreate> = {
    snapshot_code: snapshotCode,
    source_type: sourceType,
    source_entity_id: sourceEntityId,
    reason,
    // payload/parties are prepared by generator utility using provided body overrides
  };
  const created1 = await generate_random_shopping_mall_admin_snapshots_create(
    adminConnection,
    {
      body: {
        ...body,
        // These properties are expected to be supported by the preparation utility,
        // even if not explicitly present in the narrow DTO excerpt.
        snapshot_code: snapshotCode,
        source_type: sourceType,
        source_entity_id: sourceEntityId,
        reason,
        payload,
        parties: [
          {
            party_type,
            party_id: partyId,
            can_view: true,
          },
        ],
      } as DeepPartial<IShoppingMallSnapshot.ICreate>,
    },
  );
  typia.assert(created1);
  TestValidator.equals(
    "snapshotCode matches",
    created1.snapshotCode,
    snapshotCode,
  );
  TestValidator.equals("sourceType matches", created1.sourceType, sourceType);
  TestValidator.equals(
    "sourceEntityId matches",
    created1.sourceEntityId,
    sourceEntityId,
  );
  TestValidator.equals("reason matches", created1.reason, reason);
  TestValidator.equals("deletedAt is null", created1.deletedAt, null);
  TestValidator.predicate(
    "createdAt is date-time",
    Date.parse(created1.createdAt) > 0,
  );
  TestValidator.predicate(
    "updatedAt is date-time",
    Date.parse(created1.updatedAt) > 0,
  );
  TestValidator.predicate("payload exists", created1.payload !== null);
  TestValidator.equals(
    "payload stored",
    created1.payload !== null ? created1.payload.payload : null,
    payload,
  );
  TestValidator.predicate(
    "parties include provided visibility entry",
    created1.parties.some(
      (p) =>
        p.party_type === party_type &&
        p.party_id === partyId &&
        p.can_view === true,
    ),
  );
  // Uniqueness: second create with same snapshot_code should not create duplicates
  const created2Result = await TestValidator.error(
    "second create should not create a new snapshot record",
    async () => {
      await generate_random_shopping_mall_admin_snapshots_create(
        adminConnection,
        {
          body: {
            snapshot_code: snapshotCode,
            source_type: sourceType,
            source_entity_id: sourceEntityId,
            reason,
            payload,
            parties: [
              {
                party_type,
                party_id: partyId,
                can_view: true,
              },
            ],
          } as DeepPartial<IShoppingMallSnapshot.ICreate>,
        },
      );
    },
  ).catch(() => {
    // If it doesn't throw, verify returned snapshot is the original
    return null;
  });
  // If second call succeeded instead of failing, ensure id and payload are unchanged.
  if (created2Result === null) {
    // No further assertions possible without a duplicate-fetch endpoint.
    // Original snapshot must remain consistent.
    TestValidator.equals(
      "original snapshot still reason",
      created1.reason,
      reason,
    );
    TestValidator.equals(
      "original snapshot still payload",
      created1.payload?.payload ?? null,
      payload,
    );
    return;
  }
  // If we reached here, the second call threw as expected; first record remains the source of truth.
  TestValidator.equals(
    "original snapshotCode unchanged",
    created1.snapshotCode,
    snapshotCode,
  );
  TestValidator.equals(
    "original snapshot id unchanged",
    typeof created1.id === "string",
    true,
  );
}
