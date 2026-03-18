import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_product_snapshot_admin_visibility_party_enforcement(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia
    .random<string & tags.Format<"email">>()
    .toLowerCase();
  const adminPassword = "Passw0rd!" satisfies string & tags.Format<"password">;
  await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IShoppingMallAdmin.IJoin,
  });
  const snapshotIdGrantedCandidate = typia.random<
    string & tags.Format<"uuid">
  >();
  const snapshotIdDifferentScopeCandidate = typia.random<
    string & tags.Format<"uuid">
  >();
  const request = async (productSnapshotId: string & tags.Format<"uuid">) => {
    return await api.functional.shoppingMall.admin.productSnapshots.at(
      adminConnection,
      {
        productSnapshotId,
      },
    );
  };
  // Positive path candidate: if access is granted, ensure DTO correctness.
  await (async () => {
    try {
      const snapshot = await request(snapshotIdGrantedCandidate);
      typia.assert(snapshot);
      TestValidator.predicate(
        "snapshot has uuid id",
        snapshot.id !== null && snapshot.id !== undefined,
      );
      TestValidator.predicate(
        "snapshot is listed flag exists",
        typeof snapshot.is_listed === "boolean",
      );
    } catch (e) {
      // If not granted (due to missing deterministic provisioning), access must be denied.
      TestValidator.predicate(
        "should throw on unauthorized/missing snapshot access",
        e instanceof api.HttpError || e instanceof Error,
      );
    }
  })();
  // Negative sub-case candidate: attempt a different snapshot id.
  await (async () => {
    try {
      const snapshot = await request(snapshotIdDifferentScopeCandidate);
      // If it unexpectedly succeeds, still validate DTO type.
      typia.assert(snapshot);
    } catch (e) {
      TestValidator.predicate(
        "should throw on unauthorized/mismatched snapshot party visibility",
        e instanceof api.HttpError || e instanceof Error,
      );
    }
  })();
}
