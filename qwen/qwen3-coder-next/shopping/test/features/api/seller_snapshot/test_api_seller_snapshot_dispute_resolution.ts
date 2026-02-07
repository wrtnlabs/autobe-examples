import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSellersSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellersSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_seller_snapshot_dispute_resolution(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Create admin connection by joining as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: typia.random<IShoppingMallAdmin.IJoin>(),
  });
  typia.assert(adminConnection.headers);
  // Create a seller snapshot first (requires seller profile)
  const snapshot = await api.functional.shoppingMall.sellers_snapshots.update(
    adminConnection,
    {
      body: typia.random<IShoppingMallSellersSnapshot.IRequest>(),
    },
  );
  typia.assert(snapshot);
  // Update snapshot metadata for dispute resolution
  const updatedSnapshot =
    await api.functional.shoppingMall.sellers_snapshots.update(
      adminConnection,
      {
        body: {
          metadata: {
            dispute_notes: RandomGenerator.paragraph({ sentences: 3 }),
            case_tags: ["dispute", "refund", "investigation"] as const,
            resolved: false,
          },
        } satisfies IShoppingMallSellersSnapshot.IRequest,
      },
    );
  typia.assert(updatedSnapshot);
  // Verify dispute resolution metadata was stored
  TestValidator.predicate(
    "snapshot has dispute notes",
    (updatedSnapshot as any).metadata?.dispute_notes !== undefined,
  );
  TestValidator.predicate(
    "snapshot has case tags",
    (updatedSnapshot as any).metadata?.case_tags !== undefined,
  );
  TestValidator.equals(
    "dispute resolution context stored",
    (updatedSnapshot as any).metadata?.case_tags,
    ["dispute", "refund", "investigation"],
  );
}
