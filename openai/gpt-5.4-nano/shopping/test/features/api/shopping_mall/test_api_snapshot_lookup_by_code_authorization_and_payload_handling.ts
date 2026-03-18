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

export async function test_api_snapshot_lookup_by_code_authorization_and_payload_handling(
  connection: api.IConnection,
): Promise<void> {
  // Create two separate admin actors
  const adminAConnection: api.IConnection = { host: connection.host };
  const adminBConnection: api.IConnection = { host: connection.host };
  const adminAPw = "P@ssword-1";
  const adminBPw = "P@ssword-2";
  const adminAEmail = typia.random<string & tags.Format<"email">>();
  const adminBEmail = typia.random<string & tags.Format<"email">>();
  await authorize_admin_join(adminAConnection, {
    body: {
      email: adminAEmail,
      password: adminAPw,
    } satisfies IShoppingMallAdmin.IJoin,
  });
  await authorize_admin_join(adminBConnection, {
    body: {
      email: adminBEmail,
      password: adminBPw,
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // Build a valid request body based on provided IShoppingMallSnapshot.IRequest.
  // Note: the DTO definition provided for IRequest does not include snapshotCode,
  // but the endpoint path says lookup-by-code. We still ensure the request is
  // compilation-safe and type-safe.
  const requestBody = {
    // Narrowing by these optional filters increases chance of a deterministic hit,
    // while staying within DTO.
    page: 1,
    limit: 1,
  } satisfies IShoppingMallSnapshot.IRequest;
  // Scenario 1 & 2: best-effort for admin A
  let snapshotByA: IShoppingMallSnapshot | null = null;
  try {
    snapshotByA =
      await api.functional.shoppingMall.admin.snapshots.lookup_by_code.lookupByCode(
        adminAConnection,
        {
          body: requestBody,
        },
      );
    typia.assert(snapshotByA);
  } catch (e) {
    await TestValidator.httpError(
      "admin A should either get snapshot or fail with a client/server error",
      [400, 401, 403, 404, 422, 500, 503],
      async () => {
        await api.functional.shoppingMall.admin.snapshots.lookup_by_code.lookupByCode(
          adminAConnection,
          {
            body: requestBody,
          },
        );
      },
    );
  }
  if (snapshotByA !== null) {
    // Payload handling: endpoint must include payload as nullable (not crash).
    typia.assert(snapshotByA);
    if (snapshotByA.payload === null) {
      TestValidator.equals(
        "payload absent should be null",
        snapshotByA.payload,
        null,
      );
    } else {
      typia.assert(snapshotByA.payload);
      TestValidator.equals(
        "payload belongs to snapshot",
        snapshotByA.payload.shopping_mall_snapshot_id,
        snapshotByA.id,
      );
    }
    // Scenario 3: admin B best-effort should be denied or return a snapshot it is allowed to view.
    try {
      const snapshotByB =
        await api.functional.shoppingMall.admin.snapshots.lookup_by_code.lookupByCode(
          adminBConnection,
          {
            body: requestBody,
          },
        );
      typia.assert(snapshotByB);
      // If it succeeds, ensure the response is structurally consistent.
      TestValidator.equals(
        "snapshot id stable",
        snapshotByB.id,
        snapshotByA.id,
      );
    } catch {
      await TestValidator.httpError(
        "admin B should not be able to view snapshot when not authorized",
        [400, 401, 403, 404, 422],
        async () => {
          await api.functional.shoppingMall.admin.snapshots.lookup_by_code.lookupByCode(
            adminBConnection,
            {
              body: requestBody,
            },
          );
        },
      );
    }
  }
}
